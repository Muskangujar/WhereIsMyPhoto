#!/usr/bin/env tsx
/**
 * Copies face-api model weights from the npm package to ./models/
 * so they are available as a local, version-pinned cache.
 *
 * Run: npx tsx scripts/download-models.ts
 */
import fs from "fs";
import path from "path";

const SRC = path.resolve(
  __dirname,
  "../node_modules/@vladmandic/face-api/model"
);
const DEST = path.resolve(__dirname, "../models");

const NEEDED = [
  "ssd_mobilenetv1_model-weights_manifest.json",
  "ssd_mobilenetv1_model.bin",
  "face_landmark_68_model-weights_manifest.json",
  "face_landmark_68_model.bin",
  "face_recognition_model-weights_manifest.json",
  "face_recognition_model.bin",
];

fs.mkdirSync(DEST, { recursive: true });

let copied = 0;
for (const file of NEEDED) {
  const src = path.join(SRC, file);
  const dest = path.join(DEST, file);
  if (!fs.existsSync(src)) {
    console.warn(`  ⚠  Not found: ${src}`);
    continue;
  }
  fs.copyFileSync(src, dest);
  const size = (fs.statSync(dest).size / 1024).toFixed(0);
  console.log(`  ✓  ${file}  (${size} KB)`);
  copied++;
}

console.log(`\nCopied ${copied}/${NEEDED.length} model files to ./models/`);
console.log(
  "Models are loaded from node_modules at runtime; ./models/ is an optional local cache."
);
