/**
 * Usage: npx hardhat run scripts/attest.ts --network localhost -- <record.json>
 * Or: node -r ts-node/register scripts/attest.ts <record.json>
 */
import { ethers, network } from "hardhat";
import fs from "fs";
import path from "path";

// Reuse the pure TS Merkle lib from the Next.js src
// (resolved via relative path since this is a separate package)
function keccak256(data: Uint8Array): string {
  return ethers.keccak256(data);
}

function toUtf8Bytes(s: string): Uint8Array {
  return ethers.toUtf8Bytes(s);
}

function hashPair(a: string, b: string): string {
  const [lo, hi] = a < b ? [a, b] : [b, a];
  const packed = Buffer.concat([
    Buffer.from(lo.slice(2), "hex"),
    Buffer.from(hi.slice(2), "hex"),
  ]);
  return keccak256(packed);
}

function buildTree(leaves: string[]): { root: string; layers: string[][] } {
  let layer = [...leaves];
  const layers: string[][] = [layer];
  while (layer.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      next.push(i + 1 < layer.length ? hashPair(layer[i], layer[i + 1]) : layer[i]);
    }
    layer = next;
    layers.push(layer);
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
}

const FIELD_NAMES: (keyof DiscoveryRecord)[] = [
  "imageSha256", "faceDescriptorHash", "postUrl",
  "postImageSha256", "similarityScore", "timestampIso",
];

function buildDiscoveryMerkle(record: DiscoveryRecord) {
  const leaves = FIELD_NAMES.map((f) =>
    keccak256(toUtf8Bytes(`${f}:${String(record[f])}`))
  );
  const { root } = buildTree(leaves);
  const canonical = JSON.stringify({
    imageSha256: record.imageSha256,
    faceDescriptorHash: record.faceDescriptorHash,
    postUrl: record.postUrl,
    postImageSha256: record.postImageSha256,
    similarityScore: record.similarityScore,
    timestampIso: record.timestampIso,
  });
  const recordId = keccak256(toUtf8Bytes(canonical));
  return { merkleRoot: root, recordId };
}

const ABI = [
  "function attest(bytes32 recordId, bytes32 merkleRoot) external",
  "event Attested(bytes32 indexed recordId, bytes32 merkleRoot, address attester, uint256 timestamp)",
];

async function main() {
  const recordPath = process.env.RECORD_PATH ?? process.argv[process.argv.length - 1];
  if (!recordPath || !fs.existsSync(recordPath)) {
    console.error("Usage: RECORD_PATH=<path.json> npx hardhat run scripts/attest.ts --network <net>");
    process.exit(1);
  }

  const record: DiscoveryRecord = JSON.parse(fs.readFileSync(recordPath, "utf-8"));
  const { merkleRoot, recordId } = buildDiscoveryMerkle(record);

  const deploymentPath = path.resolve(__dirname, "../deployment.json");
  if (!fs.existsSync(deploymentPath)) {
    console.error("No deployment.json — run deploy.ts first.");
    process.exit(1);
  }
  const { [network.name]: dep } = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
  if (!dep) {
    console.error(`No deployment for network '${network.name}'.`);
    process.exit(1);
  }

  const [signer] = await ethers.getSigners();
  const contract = new ethers.Contract(dep.address, ABI, signer);

  console.log(`Attesting record on '${network.name}'...`);
  console.log(`  recordId:   ${recordId}`);
  console.log(`  merkleRoot: ${merkleRoot}`);

  // EIP-712 signature
  const domain = {
    name: "WhereIsMyPhoto", version: "1",
    chainId: dep.chainId, verifyingContract: dep.address,
  };
  const types = {
    DiscoveryRecord: [
      { name: "imageSha256", type: "string" },
      { name: "faceDescriptorHash", type: "string" },
      { name: "postUrl", type: "string" },
      { name: "merkleRoot", type: "bytes32" },
      { name: "timestampIso", type: "string" },
    ],
  };
  const value = {
    imageSha256: record.imageSha256,
    faceDescriptorHash: record.faceDescriptorHash,
    postUrl: record.postUrl,
    merkleRoot,
    timestampIso: record.timestampIso,
  };
  const sig = await signer.signTypedData(domain, types, value);
  console.log(`  EIP-712 sig: ${sig.slice(0, 20)}...`);

  const tx = await contract.attest(recordId, merkleRoot);
  const receipt = await tx.wait();
  console.log(`  ✓ tx: ${receipt.hash}  block: ${receipt.blockNumber}`);

  if (network.name === "amoy") {
    console.log(`  Explorer: https://amoy.polygonscan.com/tx/${receipt.hash}`);
  }

  // Append attestation metadata to the record file
  const attestations = {
    ...record,
    _attestation: {
      network: network.name,
      contractAddress: dep.address,
      recordId,
      merkleRoot,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      eip712Signature: sig,
      attestedAt: new Date().toISOString(),
      explorerUrl: network.name === "amoy"
        ? `https://amoy.polygonscan.com/tx/${receipt.hash}`
        : null,
    },
  };

  const outDir = path.resolve(__dirname, "../../attestations");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${recordId.slice(0, 16)}.json`);
  fs.writeFileSync(outPath, JSON.stringify(attestations, null, 2));
  console.log(`  Saved to: ${outPath}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
