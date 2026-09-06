let faceapi: any = null;
let modelsLoaded = false;
let modelLoadingPromise: Promise<boolean> | null = null;

export interface FaceDetectionResult {
  hasFace: boolean;
  box?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  landmarks?: { x: number; y: number }[];
  confidence?: number;
  faceCropBlob?: Blob;
  faceCropDataUrl?: string;
}

export async function loadFaceApi(): Promise<any> {
  if (typeof window === "undefined") return null;
  if (!faceapi) {
    faceapi = await import("@vladmandic/face-api");
  }
  return faceapi;
}

export async function initFaceModels(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (modelsLoaded) return true;
  if (modelLoadingPromise) return modelLoadingPromise;

  modelLoadingPromise = (async () => {
    try {
      const api = await loadFaceApi();
      if (!api) return false;

      const MODEL_URL = "/models";
      await Promise.all([
        api.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        api.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
      ]);

      modelsLoaded = true;
      return true;
    } catch (err) {
      console.warn("Failed to load local face models, falling back to CDN:", err);
      try {
        const api = await loadFaceApi();
        const CDN_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/";
        await Promise.all([
          api.nets.tinyFaceDetector.loadFromUri(CDN_URL),
          api.nets.faceLandmark68TinyNet.loadFromUri(CDN_URL),
        ]);
        modelsLoaded = true;
        return true;
      } catch (cdnErr) {
        console.error("Failed to load face models from CDN:", cdnErr);
        return false;
      }
    }
  })();

  return modelLoadingPromise;
}

/**
 * Detect single face with 68 dlib-style facial landmarks and generate an isolated face crop.
 */
export async function detectFaceOnly(
  imageElement: HTMLImageElement
): Promise<FaceDetectionResult> {
  const ready = await initFaceModels();
  if (!ready || !faceapi) {
    return { hasFace: false };
  }

  try {
    // Pass 1: Standard threshold (0.25)
    let detection = await faceapi
      .detectSingleFace(
        imageElement,
        new faceapi.TinyFaceDetectorOptions({
          inputSize: 416,
          scoreThreshold: 0.25,
        })
      )
      .withFaceLandmarks(true);

    // Pass 2: Fallback for tricky lighting or angled faces (0.15, size 512)
    if (!detection) {
      detection = await faceapi
        .detectSingleFace(
          imageElement,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 512,
            scoreThreshold: 0.15,
          })
        )
        .withFaceLandmarks(true);
    }

    if (!detection) {
      return { hasFace: false };
    }

    const { box } = detection.detection;
    const landmarks = detection.landmarks.positions.map((p: any) => ({
      x: p.x,
      y: p.y,
    }));
    const confidence = detection.detection.score;

    // Tight biometric face crop: strictly isolate facial features and cut out apparel/accessories
    const naturalWidth = imageElement.naturalWidth || imageElement.width;
    const naturalHeight = imageElement.naturalHeight || imageElement.height;

    const marginX = box.width * 0.12;
    const marginTop = box.height * 0.18;
    const marginBottom = box.height * 0.12;

    const cropX = Math.max(0, box.x - marginX);
    const cropY = Math.max(0, box.y - marginTop);
    const cropW = Math.min(naturalWidth - cropX, box.width + marginX * 2);
    const cropH = Math.min(naturalHeight - cropY, box.height + marginTop + marginBottom);

    // Target minimum 512px for high-fidelity reverse image search
    const minTarget = 512;
    const maxDim = Math.max(cropW, cropH);
    const scale = maxDim < minTarget ? minTarget / maxDim : 1;
    const destW = Math.round(cropW * scale);
    const destH = Math.round(cropH * scale);

    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = destW;
    cropCanvas.height = destH;
    const cropCtx = cropCanvas.getContext("2d");

    let faceCropBlob: Blob | undefined;
    let faceCropDataUrl: string | undefined;

    if (cropCtx) {
      cropCtx.imageSmoothingEnabled = true;
      cropCtx.imageSmoothingQuality = "high";
      cropCtx.drawImage(
        imageElement,
        cropX,
        cropY,
        cropW,
        cropH,
        0,
        0,
        destW,
        destH
      );

      faceCropDataUrl = cropCanvas.toDataURL("image/jpeg", 0.95);
      faceCropBlob = await new Promise<Blob>((resolve) => {
        cropCanvas.toBlob(
          (blob) => resolve(blob || new Blob()),
          "image/jpeg",
          0.95
        );
      });
    }

    return {
      hasFace: true,
      box: {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
      },
      landmarks,
      confidence,
      faceCropBlob,
      faceCropDataUrl,
    };
  } catch (err) {
    console.error("Error during face detection:", err);
    return { hasFace: false };
  }
}

/**
 * Draw dlib 68-point landmarks and face boundary box on a target canvas
 */
export function drawDlibMesh(
  canvas: HTMLCanvasElement,
  imageElement: HTMLImageElement,
  result: FaceDetectionResult
) {
  const ctx = canvas.getContext("2d");
  if (!ctx || !result.hasFace || !result.box || !result.landmarks) return;

  const displayWidth = canvas.width;
  const displayHeight = canvas.height;
  const naturalWidth = imageElement.naturalWidth || imageElement.width;
  const naturalHeight = imageElement.naturalHeight || imageElement.height;

  const scaleX = displayWidth / naturalWidth;
  const scaleY = displayHeight / naturalHeight;

  ctx.clearRect(0, 0, displayWidth, displayHeight);

  // Scaled box
  const bx = result.box.x * scaleX;
  const by = result.box.y * scaleY;
  const bw = result.box.width * scaleX;
  const bh = result.box.height * scaleY;

  // 1. Draw High-Tech Targeting Bounding Box
  ctx.strokeStyle = "rgba(16, 185, 129, 0.85)"; // Emerald-500
  ctx.lineWidth = 2;
  ctx.strokeRect(bx, by, bw, bh);

  // Corner Accents
  const cornerLength = Math.min(bw, bh) * 0.2;
  ctx.strokeStyle = "#059669"; // Emerald-600
  ctx.lineWidth = 3.5;

  // Top-left
  ctx.beginPath();
  ctx.moveTo(bx, by + cornerLength);
  ctx.lineTo(bx, by);
  ctx.lineTo(bx + cornerLength, by);
  ctx.stroke();

  // Top-right
  ctx.beginPath();
  ctx.moveTo(bx + bw - cornerLength, by);
  ctx.lineTo(bx + bw, by);
  ctx.lineTo(bx + bw, by + cornerLength);
  ctx.stroke();

  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(bx, by + bh - cornerLength);
  ctx.lineTo(bx, by + bh);
  ctx.lineTo(bx + cornerLength, by + bh);
  ctx.stroke();

  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(bx + bw - cornerLength, by + bh);
  ctx.lineTo(bx + bw, by + bh);
  ctx.lineTo(bx + bw, by + bh - cornerLength);
  ctx.stroke();

  // Badge label
  const confPct = Math.round((result.confidence || 0.95) * 100);
  ctx.fillStyle = "rgba(5, 150, 105, 0.9)";
  ctx.fillRect(bx, Math.max(0, by - 22), 160, 22);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 10px monospace";
  ctx.fillText(`DLIB 68-PT FACE: ${confPct}%`, bx + 6, Math.max(15, by - 7));

  // 2. Helper to draw connecting landmark lines
  const pts = result.landmarks.map((p) => ({
    x: p.x * scaleX,
    y: p.y * scaleY,
  }));

  const drawContour = (indices: number[], close = false) => {
    if (indices.length === 0) return;
    ctx.beginPath();
    ctx.moveTo(pts[indices[0]].x, pts[indices[0]].y);
    for (let i = 1; i < indices.length; i++) {
      ctx.lineTo(pts[indices[i]].x, pts[indices[i]].y);
    }
    if (close) {
      ctx.closePath();
    }
    ctx.stroke();
  };

  // Wireframe lines
  ctx.strokeStyle = "rgba(6, 182, 212, 0.6)"; // Cyan-500
  ctx.lineWidth = 1.2;

  // Jaw: 0-16
  drawContour(Array.from({ length: 17 }, (_, i) => i));
  // Right eyebrow: 17-21
  drawContour([17, 18, 19, 20, 21]);
  // Left eyebrow: 22-26
  drawContour([22, 23, 24, 25, 26]);
  // Nose bridge: 27-30
  drawContour([27, 28, 29, 30]);
  // Lower nose: 30-35
  drawContour([30, 31, 32, 33, 34, 35, 30]);
  // Right eye: 36-41
  drawContour([36, 37, 38, 39, 40, 41], true);
  // Left eye: 42-47
  drawContour([42, 43, 44, 45, 46, 47], true);
  // Outer lip: 48-59
  drawContour([48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59], true);
  // Inner lip: 60-67
  drawContour([60, 61, 62, 63, 64, 65, 66, 67], true);

  // 3. Draw All 68 Landmark Dots
  for (let i = 0; i < pts.length; i++) {
    const pt = pts[i];
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 2, 0, 2 * Math.PI);
    ctx.fillStyle = "#10b981"; // Emerald
    ctx.fill();

    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 0.8, 0, 2 * Math.PI);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
  }
}
