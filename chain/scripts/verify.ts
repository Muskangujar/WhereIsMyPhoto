/**
 * Usage:
 *   npx hardhat run scripts/verify.ts --network localhost -- <attested-record.json>
 *   npx hardhat run scripts/verify.ts --network localhost -- <attested-record.json> --tamper
 */
import { ethers, network } from "hardhat";
import fs from "fs";
import path from "path";

function keccak256(data: Uint8Array): string {
  return ethers.keccak256(data);
}
function toUtf8Bytes(s: string): Uint8Array {
  return ethers.toUtf8Bytes(s);
}
function hashPair(a: string, b: string): string {
  const [lo, hi] = a < b ? [a, b] : [b, a];
  return keccak256(Buffer.concat([Buffer.from(lo.slice(2), "hex"), Buffer.from(hi.slice(2), "hex")]));
}
function buildTree(leaves: string[]) {
  let layer = [...leaves];
  const layers: string[][] = [layer];
  while (layer.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < layer.length; i += 2)
      next.push(i + 1 < layer.length ? hashPair(layer[i], layer[i + 1]) : layer[i]);
    layer = next; layers.push(layer);
  }
  return { root: layer[0], layers };
}

interface DiscoveryRecord {
  imageSha256: string;
  faceDescriptorHash: string;
  postUrl: string;
  postImageSha256: string;
  similarityScore: number;
  timestampIso: string;
  _attestation?: {
    recordId: string;
    merkleRoot: string;
    txHash: string;
    blockNumber: number;
    eip712Signature: string;
    contractAddress: string;
    explorerUrl: string | null;
  };
}

const FIELD_NAMES: (keyof DiscoveryRecord)[] = [
  "imageSha256", "faceDescriptorHash", "postUrl",
  "postImageSha256", "similarityScore", "timestampIso",
];

function buildDiscoveryMerkle(record: DiscoveryRecord) {
  const leaves = FIELD_NAMES.map((f) =>
    keccak256(toUtf8Bytes(`${f}:${String((record as unknown as Record<string, unknown>)[f as string])}`))
  );
  const { root } = buildTree(leaves);
  const canonical = JSON.stringify({
    imageSha256: record.imageSha256, faceDescriptorHash: record.faceDescriptorHash,
    postUrl: record.postUrl, postImageSha256: record.postImageSha256,
    similarityScore: record.similarityScore, timestampIso: record.timestampIso,
  });
  return { merkleRoot: root, recordId: keccak256(toUtf8Bytes(canonical)) };
}

const ABI = [
  "function getAttestation(bytes32 recordId) external view returns (bytes32 merkleRoot, address attester, uint64 timestamp)",
];

async function main() {
  const args = process.argv;
  const tamper = args.includes("--tamper") || process.env.TAMPER === "1";
  // Accept path from env var (recommended) or last .json arg
  const recordPath = process.env.RECORD_PATH ?? args.find((a) => a.endsWith(".json"));

  if (!recordPath || !fs.existsSync(recordPath)) {
    console.error("Usage: RECORD_PATH=<path.json> npx hardhat run scripts/verify.ts --network <net>");
    console.error("       TAMPER=1 RECORD_PATH=<path.json> npx hardhat run scripts/verify.ts --network <net>");
    process.exit(1);
  }

  let record: DiscoveryRecord = JSON.parse(fs.readFileSync(recordPath, "utf-8"));

  if (tamper) {
    console.log("⚠  --tamper flag: mutating similarityScore in memory to simulate tampering");
    record = { ...record, similarityScore: record.similarityScore + 0.1 };
  }

  const att = record._attestation;
  if (!att) {
    console.error("No _attestation field found — run attest.ts first.");
    process.exit(1);
  }

  const deploymentPath = path.resolve(__dirname, "../deployment.json");
  const { [network.name]: dep } = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));

  const provider = ethers.provider;
  const contract = new ethers.Contract(dep.address, ABI, provider);

  const { merkleRoot: computedRoot, recordId } = buildDiscoveryMerkle(record);
  const [onChainRoot, attester, timestamp] = await contract.getAttestation(att.recordId);

  console.log(`\n── Verification on '${network.name}' ───────────────────────────`);
  console.log(`  recordId (from file): ${att.recordId}`);
  console.log(`  recomputed recordId:  ${recordId}`);
  console.log(`  on-chain merkleRoot:  ${onChainRoot}`);
  console.log(`  recomputed root:      ${computedRoot}`);
  console.log(`  attester:             ${attester}`);
  console.log(`  attested at:          ${new Date(Number(timestamp) * 1000).toISOString()}`);

  // Recover EIP-712 signer
  const domain = {
    name: "WhereIsMyPhoto", version: "1",
    chainId: dep.chainId, verifyingContract: dep.address,
  };
  const types = {
    DiscoveryRecord: [
      { name: "imageSha256", type: "string" }, { name: "faceDescriptorHash", type: "string" },
      { name: "postUrl", type: "string" }, { name: "merkleRoot", type: "bytes32" },
      { name: "timestampIso", type: "string" },
    ],
  };
  const value = {
    imageSha256: record.imageSha256, faceDescriptorHash: record.faceDescriptorHash,
    postUrl: record.postUrl, merkleRoot: computedRoot, timestampIso: record.timestampIso,
  };
  const recoveredSigner = ethers.verifyTypedData(domain, types, value, att.eip712Signature);
  const signerMatch = recoveredSigner.toLowerCase() === attester.toLowerCase();

  console.log(`  EIP-712 recovered:    ${recoveredSigner}`);
  console.log(`  Signer match:         ${signerMatch ? "✓ YES" : "✗ NO"}`);
  console.log("─".repeat(60));

  const rootMatch = onChainRoot === computedRoot;
  const recordIdMatch = att.recordId === recordId;

  if (rootMatch && recordIdMatch && signerMatch && onChainRoot !== ethers.ZeroHash) {
    console.log("✅  PASS — record is authentic and unmodified\n");
  } else {
    console.log("❌  FAIL — record has been tampered with or does not match chain");
    if (!rootMatch) console.log("   Reason: Merkle roots differ");
    if (!recordIdMatch) console.log("   Reason: recordId differs");
    if (!signerMatch) console.log("   Reason: EIP-712 signer mismatch");
    console.log();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
