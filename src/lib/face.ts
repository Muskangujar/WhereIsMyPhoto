// Face detection using @vladmandic/face-api with its bundled TF.js WASM backend.
// Key constraints:
// - Use face-api's internal `tf` instance (avoids two-instance conflicts)
// - Convert images to RGB (3 channels), not RGBA — face-api SSD needs RGB
// - Resize to ≤480px longest side before detection; scale boxes back afterward
// - No native bindings: wasm backend is pure WebAssembly
import path from "path";
import sharp from "sharp";
import crypto from "crypto";

const MODEL_PATH = path.resolve(
  process.cwd(),
  "node_modules/@vladmandic/face-api/model"
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let faceapi: any = null;
let modelsLoaded = false;
let initPromise: Promise<void> | null = null;

async function init(): Promise<void> {
  if (modelsLoaded) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    faceapi = await import("@vladmandic/face-api/dist/face-api.node-wasm.js");
    const tf = faceapi.tf;
    await tf.setBackend("wasm");
    await tf.ready();
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_PATH);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_PATH);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_PATH);
    modelsLoaded = true;
  })();

  return initPromise;
}

export interface FaceBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaceDetection {
  box: FaceBoundingBox;
  score: number;
  descriptor: Float32Array; // 128-D embedding
  landmarks: { x: number; y: number }[];
}

// Detection size ceiling — keeps inference fast, scales boxes back afterward
const MAX_DETECT_DIM = 480;

export async function detectFaces(buffer: Buffer): Promise<FaceDetection[]> {
  await init();
  const tf = faceapi.tf;

  // Read dimensions after EXIF rotation so portrait images have correct W/H
  const rotated = await sharp(buffer).rotate().toBuffer({ resolveWithObject: true });
  const origW = rotated.info.width;
  const origH = rotated.info.height;

  const scale = Math.min(1, MAX_DETECT_DIM / Math.max(origW, origH));
  const detW = Math.round(origW * scale);
  const detH = Math.round(origH * scale);

  // RGB (3 channels) — use already-rotated buffer
  const { data } = await sharp(rotated.data)
    .resize(detW, detH, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const tensor = tf.tensor3d(new Uint8Array(data), [detH, detW, 3], "int32");
  const tensorF: ReturnType<typeof tf.Tensor3D> = tensor.toFloat().div(tf.scalar(255));

  let raw: unknown[];
  try {
    raw = await faceapi
      .detectAllFaces(
        tensorF,
        new faceapi.SsdMobilenetv1Options({ minConfidence: 0.05 })
      )
      .withFaceLandmarks()
      .withFaceDescriptors();
  } finally {
    tensor.dispose();
    tensorF.dispose();
  }

  const invScale = 1 / scale;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (raw as any[]).map((r: any) => ({
    box: {
      x: Math.round(r.detection.box.x * invScale),
      y: Math.round(r.detection.box.y * invScale),
      width: Math.round(r.detection.box.width * invScale),
      height: Math.round(r.detection.box.height * invScale),
    },
    score: r.detection.score,
    descriptor: r.descriptor as Float32Array,
    landmarks: (r.landmarks.positions as { x: number; y: number }[]).map((p) => ({
      x: Math.round(p.x * invScale),
      y: Math.round(p.y * invScale),
    })),
  }));
}

export async function cropFace(
  buffer: Buffer,
  box: FaceBoundingBox,
  paddingFraction = 0.25
): Promise<Buffer> {
  const meta = await sharp(buffer).metadata();
  const imgW = meta.width ?? 0;
  const imgH = meta.height ?? 0;

  const padX = Math.round(box.width * paddingFraction);
  const padY = Math.round(box.height * paddingFraction);

  const left = Math.max(0, box.x - padX);
  const top = Math.max(0, box.y - padY);
  const width = Math.min(imgW - left, box.width + 2 * padX);
  const height = Math.min(imgH - top, box.height + 2 * padY);

  if (width <= 0 || height <= 0) {
    return sharp(buffer).jpeg({ quality: 90 }).toBuffer();
  }

  return sharp(buffer)
    .extract({ left, top, width, height })
    .jpeg({ quality: 90 })
    .toBuffer();
}

export function descriptorDistance(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

export function descriptorHash(descriptor: Float32Array): string {
  const serialized = Array.from(descriptor)
    .map((f) => f.toFixed(8))
    .join(",");
  return crypto.createHash("sha256").update(serialized).digest("hex");
}
