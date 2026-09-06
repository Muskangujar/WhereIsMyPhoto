#!/usr/bin/env tsx
/**
 * WhereIsMyPhoto end-to-end pipeline CLI
 *
 * Usage:
 *   npm run pipeline -- --image ./samples/sample_face.jpg
 *   npm run pipeline -- --image ./samples/me.jpg --network amoy
 *   npm run pipeline -- --image ./samples/me.jpg --offline
 *
 * Requires a running Hardhat node for localhost (default):
 *   cd chain && npx hardhat node       (in a separate terminal)
 */

// Load env vars
import "dotenv/config";

import fs from "fs";
import path from "path";
import { spawn, execSync } from "child_process";
import { ethers } from "ethers";

// ── Argument parsing ─────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const get = (flag: string): string | null => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] ?? null : null;
};
const has = (flag: string) => args.includes(flag);

const imagePath = get("--image") ?? "./samples/sample_face.jpg";
const network = get("--network") ?? "localhost";
const offline = has("--offline") || !process.env.SERPER_API_KEY;

if (!fs.existsSync(imagePath)) {
  console.error(`Image not found: ${imagePath}`);
  console.error("Put a face photo at ./samples/me.jpg or pass --image <path>");
  process.exit(1);
}

// ── Utilities ────────────────────────────────────────────────────────────────
function hr(label: string) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  ${label}`);
  console.log("─".repeat(60));
}

function row(label: string, value: unknown) {
  console.log(`  ${label.padEnd(28)} ${String(value)}`);
}

async function waitForNode(maxWait = 15_000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    try {
      const res = await fetch("http://127.0.0.1:8545", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method: "eth_blockNumber", id: 1 }),
      });
      if (res.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║          WhereIsMyPhoto — End-to-End Pipeline CLI           ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  console.log(`  Image:   ${path.resolve(imagePath)}`);
  console.log(`  Network: ${network}`);
  console.log(`  Mode:    ${offline ? "offline (no Serper key)" : "live search"}`);

  // ── Step 1: Load image + diagnostics ──────────────────────────────────────
  hr("Step 1 — Image diagnostics");

  const buffer = fs.readFileSync(imagePath);
  const { getImageDiagnostics } = await import("../src/lib/diagnostics");
  const diag = await getImageDiagnostics(buffer);

  row("Resolution", `${diag.width} × ${diag.height} px`);
  row("SHA-256", diag.sha256.slice(0, 32) + "...");
  row("dHash (perceptual)", diag.dHash);
  row("Sharpness score", `${diag.sharpnessScore.toFixed(1)} / 100`);
  row("Is blurry", diag.isBlurry ? "yes ⚠" : "no ✓");

  // ── Step 2: Face detection ─────────────────────────────────────────────────
  hr("Step 2 — Face detection  (loading models, first run is slow…)");

  const { detectFaces, cropFace, descriptorHash } = await import("../src/lib/face");
  const faces = await detectFaces(buffer);

  row("Faces detected", faces.length);

  if (faces.length === 0) {
    console.log("\n  No face detected in this image. Stopping pipeline.");
    console.log("  Tip: use a clear, well-lit, front-facing portrait.");
    process.exit(0);
  }

  const primary = faces[0];
  row("Primary face score", primary.score.toFixed(3));
  row("Bounding box", `x=${primary.box.x} y=${primary.box.y} w=${primary.box.width} h=${primary.box.height}`);
  row("Descriptor (first 4)", Array.from(primary.descriptor.slice(0, 4)).map(f => f.toFixed(4)).join(", "));

  const faceHash = descriptorHash(primary.descriptor);
  row("Descriptor SHA-256", faceHash.slice(0, 32) + "...");

  // ── Step 3: Search + face-verified matching ────────────────────────────────
  hr("Step 3 — Reverse image search + face verification");

  const mimeType = imagePath.endsWith(".png") ? "image/png" : "image/jpeg";
  const faceCrop = await cropFace(buffer, primary.box).catch(() => null);

  const { searchWithLens } = await import("../src/lib/search");
  const { verifyCandidates } = await import("../src/lib/verify-face");

  const serperKey = process.env.SERPER_API_KEY;
  console.log(`  Searching (${offline ? "offline/fixtures" : "live Serper Lens"})…`);

  const candidates = await searchWithLens(buffer, faceCrop, mimeType, serperKey, offline);
  console.log(`  Candidates from search: ${candidates.length}`);

  if (candidates.length === 0) {
    console.log("\n  No search results (check SERPER_API_KEY or add --offline).");
  }

  console.log("  Verifying each candidate via face embedding…");
  const verified = await verifyCandidates(candidates.slice(0, 10), primary, 3);

  // Print ranked table
  console.log(`\n  ${"Rank".padEnd(5)} ${"Verification".padEnd(14)} ${"Similarity".padEnd(12)} ${"Domain".padEnd(30)} URL`);
  console.log("  " + "─".repeat(110));
  for (let i = 0; i < Math.min(verified.length, 8); i++) {
    const v = verified[i];
    const sim = v.similarityPct !== null ? `${v.similarityPct.toFixed(1)}%` : "n/a";
    const badge = v.verification === "verified" ? "✅ verified" : v.verification === "probable" ? "🟡 probable" : "⬜ unverified";
    console.log(`  ${String(i + 1).padEnd(5)} ${badge.padEnd(14)} ${sim.padEnd(12)} ${v.domain.padEnd(30)} ${v.candidate.url.slice(0, 60)}`);
  }

  // ── Step 4: Build discovery record ────────────────────────────────────────
  hr("Step 4 — Build discovery record + Merkle tree");

  const topMatch = verified.find((v) => v.verification !== "unverified") ?? verified[0];

  if (!topMatch) {
    console.log("\n  No verified matches. Attesting zero-footprint record.");
  }

  const timestampIso = new Date().toISOString();
  const { buildDiscoveryMerkle } = await import("../src/lib/merkle");

  const record = {
    imageSha256: diag.sha256,
    faceDescriptorHash: faceHash,
    postUrl: topMatch?.candidate.url ?? "",
    postImageSha256: topMatch?.postImageSha256 ?? "",
    similarityScore: topMatch?.similarityPct ?? 0,
    timestampIso,
  };

  const { merkleRoot, recordId, leaves } = buildDiscoveryMerkle(record);

  row("recordId", recordId.slice(0, 32) + "...");
  row("Merkle root", merkleRoot.slice(0, 32) + "...");
  row("Leaves", leaves.length);

  // ── Step 5: Auto-start Hardhat node if needed + deploy + attest ───────────
  hr("Step 5 — Blockchain attestation");

  if (network === "localhost") {
    const nodeRunning = await waitForNode(2_000);
    if (!nodeRunning) {
      console.log("  Hardhat node not running — starting it in the background…");
      const child = spawn(
        "npx",
        ["hardhat", "node"],
        { cwd: path.resolve(__dirname, "../chain"), detached: true, stdio: "ignore" }
      );
      child.unref();
      const ready = await waitForNode(15_000);
      if (!ready) {
        console.error("  ✗ Hardhat node did not start in time.");
        console.error("    Run in a separate terminal: cd chain && npx hardhat node");
        process.exit(1);
      }
      console.log("  ✓ Hardhat node started");
    } else {
      console.log("  Hardhat node already running ✓");
    }

    // Deploy if needed
    const deploymentPath = path.resolve(__dirname, "../chain/deployment.json");
    let needsDeploy = true;
    if (fs.existsSync(deploymentPath)) {
      const dep = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
      if (dep.localhost?.address) {
        // Verify contract still exists
        const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
        const code = await provider.getCode(dep.localhost.address);
        needsDeploy = code === "0x";
      }
    }

    if (needsDeploy) {
      console.log("  Deploying AttestationRegistry…");
      try {
        execSync("npx hardhat run scripts/deploy.ts --network localhost", {
          cwd: path.resolve(__dirname, "../chain"),
          stdio: "pipe",
        });
        console.log("  ✓ Contract deployed");
      } catch (e: unknown) {
        console.error("  ✗ Deploy failed:", (e as Error).message);
        process.exit(1);
      }
    } else {
      console.log("  Contract already deployed ✓");
    }
  }

  const { attestRecord, verifyRecord } = await import("../src/lib/chain");

  console.log(`  Attesting on '${network}'…`);
  let attestResult;
  try {
    attestResult = await attestRecord(record, network);
  } catch (err: unknown) {
    console.error("  ✗ Attest failed:", (err as Error).message);
    process.exit(1);
  }

  row("Tx hash", attestResult.txHash);
  row("Block number", attestResult.blockNumber);
  if (attestResult.explorerUrl) {
    row("Explorer", attestResult.explorerUrl);
  }
  row("EIP-712 signature", attestResult.eip712Signature.slice(0, 30) + "...");

  // ── Step 6: Immediate on-chain verification ────────────────────────────────
  hr("Step 6 — On-chain verification");

  const verifyResult = await verifyRecord(record, attestResult, network);

  row("On-chain root", verifyResult.onChainRoot.slice(0, 32) + "...");
  row("Computed root", verifyResult.computedRoot.slice(0, 32) + "...");
  row("Roots match", verifyResult.onChainRoot === verifyResult.computedRoot ? "✓ YES" : "✗ NO");
  row("EIP-712 signer match", verifyResult.eip712SignerMatch ? "✓ YES" : "✗ NO");

  if (verifyResult.pass && verifyResult.eip712SignerMatch) {
    console.log("\n  ✅  PASS — record is attested and verified on-chain\n");
  } else {
    console.log("\n  ❌  FAIL — verification mismatch\n");
    process.exit(1);
  }

  // Save full attestation record
  const outDir = path.resolve(__dirname, "../attestations");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${attestResult.recordId.slice(0, 16)}.json`);
  const fullRecord = { ...record, _attestation: attestResult, _verification: verifyResult };
  fs.writeFileSync(outPath, JSON.stringify(fullRecord, null, 2));
  console.log(`  Saved to: ${outPath}`);

  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║               Pipeline completed successfully!               ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");
}

main().catch((err) => {
  console.error("\nPipeline error:", err);
  process.exit(1);
});
