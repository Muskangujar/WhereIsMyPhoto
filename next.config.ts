import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // These packages are server-only (sharp, TF.js, ethers).
  // Next.js will not attempt to bundle them for the client.
  serverExternalPackages: [
    "sharp",
    "@vladmandic/face-api",
    "@tensorflow/tfjs",
    "@tensorflow/tfjs-core",
    "@tensorflow/tfjs-backend-cpu",
    "@tensorflow/tfjs-backend-wasm",
    "ethers",
  ],
  // Required for Turbopack (Next.js 16 default build engine)
  turbopack: {},
};

export default nextConfig;
