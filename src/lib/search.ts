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

// Litterbox (catbox.moe temporary hosting — auto-expires in 1 hour)
async function uploadToLitterbox(buffer: Buffer, mimeType: string): Promise<string | null> {
  const ext = mimeType.split("/")[1] || "jpg";
  const filename = `scan-${Date.now()}.${ext}`;

  const fd = new FormData();
  fd.append("reqtype", "fileupload");
  fd.append("time", "1h");
  fd.append(
    "fileToUpload",
    new Blob([new Uint8Array(buffer)], { type: mimeType }),
    filename
  );

  try {
    const res = await fetch(
      "https://litterbox.catbox.moe/resources/internals/api.php",
      { method: "POST", body: fd, signal: AbortSignal.timeout(15_000) }
    );
    if (res.ok) {
      const url = (await res.text()).trim();
      if (url.startsWith("http")) return url;
    }
  } catch (e) {
    console.warn("Litterbox upload failed:", (e as Error).message);
  }

  // Fallback: freeimage.host (note: may persist longer)
  try {
    const base64 = buffer.toString("base64");
    const fd2 = new FormData();
    fd2.append("key", "6d207e02198a847aa98d0a2a901485a5");
    fd2.append("action", "upload");
    fd2.append("source", base64);
    fd2.append("format", "json");

    const res2 = await fetch("https://freeimage.host/api/1/upload", {
      method: "POST",
      body: fd2,
      signal: AbortSignal.timeout(15_000),
    });
    if (res2.ok) {
      const json = await res2.json();
      if (json?.image?.url) return json.image.url;
    }
  } catch (e) {
    console.warn("Freeimage fallback failed:", (e as Error).message);
  }

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
  return (Array.isArray(data.organic) ? data.organic : []) as LensCandidate[];
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
    uploadToLitterbox(fullBuffer, mimeType),
    faceBuffer ? uploadToLitterbox(faceBuffer, "image/jpeg") : Promise.resolve(null),
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
