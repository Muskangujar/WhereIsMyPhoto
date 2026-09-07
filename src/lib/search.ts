import fs from "fs";
import path from "path";

export interface LensCandidate {
  url: string;
  title: string;
  snippet: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  source?: string;
}

// Upload to a public CDN so Google Lens can fetch it.
// freeimage.host is tried first (Litterbox has been returning 500s).
async function uploadToCDN(buffer: Buffer, mimeType: string): Promise<string | null> {
  // Primary: freeimage.host (base64 upload, reliable)
  try {
    const base64 = buffer.toString("base64");
    const fd = new FormData();
    fd.append("key", "6d207e02198a847aa98d0a2a901485a5");
    fd.append("action", "upload");
    fd.append("source", base64);
    fd.append("format", "json");

    const res = await fetch("https://freeimage.host/api/1/upload", {
      method: "POST",
      body: fd,
      signal: AbortSignal.timeout(30_000),
    });
    if (res.ok) {
      const json = await res.json();
      if (json?.image?.url) {
        console.log("[CDN] freeimage.host upload OK:", json.image.url);
        return json.image.url;
      }
    }
    console.warn("[CDN] freeimage.host upload failed:", res.status);
  } catch (e) {
    console.warn("[CDN] freeimage.host error:", (e as Error).message);
  }

  // Fallback: Litterbox (catbox.moe) — 1-hour temp link
  try {
    const ext = mimeType.split("/")[1] || "jpg";
    const fd2 = new FormData();
    fd2.append("reqtype", "fileupload");
    fd2.append("time", "1h");
    fd2.append(
      "fileToUpload",
      new Blob([new Uint8Array(buffer)], { type: mimeType }),
      `scan-${Date.now()}.${ext}`
    );
    const res2 = await fetch(
      "https://litterbox.catbox.moe/resources/internals/api.php",
      { method: "POST", body: fd2, signal: AbortSignal.timeout(20_000) }
    );
    if (res2.ok) {
      const url = (await res2.text()).trim();
      if (url.startsWith("http")) {
        console.log("[CDN] Litterbox upload OK:", url);
        return url;
      }
    }
    console.warn("[CDN] Litterbox upload failed:", res2.status);
  } catch (e) {
    console.warn("[CDN] Litterbox error:", (e as Error).message);
  }

  console.error("[CDN] All upload attempts failed — search will be skipped");
  return null;
}

async function querySerperLens(
  imageUrl: string,
  apiKey: string
): Promise<LensCandidate[]> {
  const res = await fetch("https://google.serper.dev/lens", {
    method: "POST",
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ url: imageUrl }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    console.error("Serper Lens error:", res.status, await res.text().catch(() => ""));
    return [];
  }

  const data = await res.json();
  // Serper Lens returns results under "organic" (link key) and optionally "visualMatches"
  const organic: any[] = Array.isArray(data.organic) ? data.organic : [];
  const visual: any[] = Array.isArray(data.visualMatches) ? data.visualMatches : [];

  // Normalise both arrays: Serper uses "link" for URL, LensCandidate expects "url"
  const norm = (arr: any[]) => arr.map((v) => ({
    url: v.link || v.url || "",
    title: v.title || "",
    snippet: v.snippet || v.source || "",
    thumbnailUrl: v.thumbnailUrl || v.imageUrl || "",
    source: v.source || "",
  }));

  return [...norm(organic), ...norm(visual)] as LensCandidate[];
}

function dedupeByUrl(candidates: LensCandidate[]): LensCandidate[] {
  const seen = new Set<string>();
  return candidates.filter((c) => {
    if (!c.url || seen.has(c.url)) return false;
    seen.add(c.url);
    return true;
  });
}

export async function searchWithLens(
  fullBuffer: Buffer,
  faceBuffer: Buffer | null,
  mimeType: string,
  apiKey: string | undefined,
  offline: boolean
): Promise<LensCandidate[]> {
  if (offline || !apiKey) {
    return loadCannedResponse();
  }

  const [fullUrl, faceUrl] = await Promise.all([
    uploadToCDN(fullBuffer, mimeType),
    faceBuffer ? uploadToCDN(faceBuffer, "image/jpeg") : Promise.resolve(null),
  ]);

  const queries: Promise<LensCandidate[]>[] = [];
  if (fullUrl) queries.push(querySerperLens(fullUrl, apiKey));
  if (faceUrl) queries.push(querySerperLens(faceUrl, apiKey));

  const all = (await Promise.all(queries)).flat();
  const deduped = dedupeByUrl(all);

  if (deduped.length > 0) {
    saveCannedResponse(deduped);
  }

  return deduped;
}

const FIXTURE_PATH = path.resolve(process.cwd(), "fixtures", "lens_response.json");

function loadCannedResponse(): LensCandidate[] {
  try {
    if (fs.existsSync(FIXTURE_PATH)) {
      return JSON.parse(fs.readFileSync(FIXTURE_PATH, "utf-8"));
    }
  } catch {}
  return [];
}

function saveCannedResponse(candidates: LensCandidate[]): void {
  try {
    fs.mkdirSync(path.dirname(FIXTURE_PATH), { recursive: true });
    fs.writeFileSync(FIXTURE_PATH, JSON.stringify(candidates, null, 2));
  } catch {}
}
