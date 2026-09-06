import sharp from "sharp";
import crypto from "crypto";

export interface ImageDiagnostics {
  width: number;
  height: number;
  sharpnessScore: number; // 0–100, Laplacian variance normalised
  isBlurry: boolean;
  dHash: string; // 16-hex-char perceptual hash
  sha256: string;
}

export async function getImageDiagnostics(buffer: Buffer): Promise<ImageDiagnostics> {
  const meta = await sharp(buffer).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");

  const gray = await sharp(buffer)
    .greyscale()
    .raw()
    .toBuffer();

  const variance = laplacianVariance(gray, width, height);
  // Empirically: variance ~0 = total blur, ~10 000+ = very sharp.
  // Map to 0–100 with a soft cap at 5 000.
  const sharpnessScore = Math.min(100, (variance / 5000) * 100);
  const isBlurry = sharpnessScore < 20;

  const dHash = await computeDHash(buffer);

  return { width, height, sharpnessScore, isBlurry, dHash, sha256 };
}

function laplacianVariance(gray: Buffer, width: number, height: number): number {
  if (width < 3 || height < 3) return 0;
  let sum = 0;
  let sumSq = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const lap =
        4 * gray[i] -
        gray[i - width] -
        gray[i + width] -
        gray[i - 1] -
        gray[i + 1];
      sum += lap;
      sumSq += lap * lap;
      count++;
    }
  }
  const mean = sum / count;
  return sumSq / count - mean * mean;
}

async function computeDHash(buffer: Buffer): Promise<string> {
  const { data } = await sharp(buffer)
    .resize(9, 8, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let bits = "";
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      bits += data[row * 9 + col] < data[row * 9 + col + 1] ? "1" : "0";
    }
  }

  let hex = "";
  for (let i = 0; i < bits.length; i += 4) {
    hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  }
  return hex;
}
