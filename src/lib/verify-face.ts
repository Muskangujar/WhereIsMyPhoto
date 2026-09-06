import crypto from "crypto";
import { LensCandidate } from "./search";
import { detectFaces, descriptorDistance, FaceDetection } from "./face";

export type MatchVerification = "verified" | "probable" | "unverified";

export interface VerifiedCandidate {
  candidate: LensCandidate;
  verification: MatchVerification;
  // Distance 0–∞, lower = more similar. null = could not fetch/detect.
  faceDistance: number | null;
  // Derived similarity 0–100. For unverified = null (not fabricated).
  similarityPct: number | null;
  postImageSha256: string | null;
  domain: string;
  category: "social" | "news" | "blog" | "portfolio";
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "unknown";
  }
}

function getCategory(domain: string): VerifiedCandidate["category"] {
  if (
    ["linkedin.com", "instagram.com", "twitter.com", "x.com",
     "facebook.com", "pinterest.com", "reddit.com", "github.com",
     "tiktok.com", "snapchat.com"].some((d) => domain.includes(d))
  ) return "social";
  if (
    ["bbc.", "cnn.", "forbes.", "medium.com", "nytimes.", "reuters.",
     "theguardian.", "news"].some((d) => domain.includes(d))
  ) return "news";
  if (["blog.", "substack.", "wordpress.", "blogger."].some((d) => domain.includes(d)))
    return "blog";
  return "portfolio";
}

async function fetchAndHashImage(
  url: string
): Promise<{ buffer: Buffer; sha256: string } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5_000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const sha256 = crypto.createHash("sha256").update(buf).digest("hex");
    return { buffer: buf, sha256 };
  } catch {
    return null;
  }
}

async function verifyOne(
  candidate: LensCandidate,
  inputFace: FaceDetection | null
): Promise<VerifiedCandidate> {
  const domain = getDomain(candidate.url);
  const category = getCategory(domain);

  const imageUrl = candidate.thumbnailUrl ?? candidate.imageUrl ?? null;

  if (!inputFace || !imageUrl) {
    return {
      candidate,
      verification: "unverified",
      faceDistance: null,
      similarityPct: null,
      postImageSha256: null,
      domain,
      category,
    };
  }

  const fetched = await fetchAndHashImage(imageUrl);
  if (!fetched) {
    return {
      candidate,
      verification: "unverified",
      faceDistance: null,
      similarityPct: null,
      postImageSha256: null,
      domain,
      category,
    };
  }

  let faces: FaceDetection[];
  try {
    faces = await detectFaces(fetched.buffer);
  } catch {
    return {
      candidate,
      verification: "unverified",
      faceDistance: null,
      similarityPct: fetched ? null : null,
      postImageSha256: fetched.sha256,
      domain,
      category,
    };
  }

  if (faces.length === 0) {
    return {
      candidate,
      verification: "unverified",
      faceDistance: null,
      similarityPct: null,
      postImageSha256: fetched.sha256,
      domain,
      category,
    };
  }

  // Pick the closest face from the candidate image
  let minDist = Infinity;
  for (const f of faces) {
    const d = descriptorDistance(inputFace.descriptor, f.descriptor);
    if (d < minDist) minDist = d;
  }

  const verification: MatchVerification =
    minDist <= 0.5 ? "verified" : minDist <= 0.6 ? "probable" : "unverified";

  // similarity = (1 - dist) * 100, clamped to [0, 100]
  const similarityPct = Math.max(0, Math.min(100, (1 - minDist) * 100));

  return {
    candidate,
    verification,
    faceDistance: minDist,
    similarityPct,
    postImageSha256: fetched.sha256,
    domain,
    category,
  };
}

export async function verifyCandidates(
  candidates: LensCandidate[],
  inputFace: FaceDetection | null,
  concurrency = 5
): Promise<VerifiedCandidate[]> {
  const results: VerifiedCandidate[] = [];

  for (let i = 0; i < candidates.length; i += concurrency) {
    const batch = candidates.slice(i, i + concurrency);
    const settled = await Promise.allSettled(
      batch.map((c) => verifyOne(c, inputFace))
    );
    for (const r of settled) {
      if (r.status === "fulfilled") results.push(r.value);
    }
  }

  // Sort: verified first, then probable, then unverified
  const order: Record<MatchVerification, number> = { verified: 0, probable: 1, unverified: 2 };
  results.sort((a, b) => {
    const cmp = order[a.verification] - order[b.verification];
    if (cmp !== 0) return cmp;
    if (a.faceDistance !== null && b.faceDistance !== null)
      return a.faceDistance - b.faceDistance;
    return 0;
  });

  return results;
}
