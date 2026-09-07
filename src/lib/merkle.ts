import { keccak256, toUtf8Bytes, AbiCoder } from "ethers";

export interface DiscoveryRecord {
  imageSha256: string;
  faceDescriptorHash: string;
  postUrl: string;
  postImageSha256: string;
  similarityScore: number;
  timestampIso: string;
}

export interface MerkleResult {
  merkleRoot: string;
  recordId: string;
  leaves: string[];
  proofs: string[][];
  fieldNames: string[];
}

const FIELD_NAMES: (keyof DiscoveryRecord)[] = [
  "imageSha256",
  "faceDescriptorHash",
  "postUrl",
  "postImageSha256",
  "similarityScore",
  "timestampIso",
];

function leafHash(fieldName: string, value: string): string {
  return keccak256(toUtf8Bytes(`${fieldName}:${value}`));
}

function hashPair(a: string, b: string): string {
  // Sorted-pair hashing — order doesn't depend on tree position
  const [lo, hi] = a < b ? [a, b] : [b, a];
  const packed = Buffer.concat([
    Buffer.from(lo.slice(2), "hex"),
    Buffer.from(hi.slice(2), "hex"),
  ]);
  return keccak256(packed);
}

function buildTree(leaves: string[]): { root: string; layers: string[][] } {
  if (leaves.length === 0) throw new Error("empty leaves");
  let layer = [...leaves];
  const layers: string[][] = [layer];

  while (layer.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      if (i + 1 < layer.length) {
        next.push(hashPair(layer[i], layer[i + 1]));
      } else {
        next.push(layer[i]); // odd node propagates up
      }
    }
    layer = next;
    layers.push(layer);
  }

  return { root: layer[0], layers };
}

function getProof(layers: string[][], leafIndex: number): string[] {
  const proof: string[] = [];
  let idx = leafIndex;
  for (let l = 0; l < layers.length - 1; l++) {
    const sibling = idx % 2 === 0 ? idx + 1 : idx - 1;
    if (sibling < layers[l].length) {
      proof.push(layers[l][sibling]);
    }
    idx = Math.floor(idx / 2);
  }
  return proof;
}

export function buildDiscoveryMerkle(record: DiscoveryRecord): MerkleResult {
  const leaves = FIELD_NAMES.map((field) =>
    leafHash(field, String(record[field]))
  );

  const { root, layers } = buildTree(leaves);
  const proofs = leaves.map((_, i) => getProof(layers, i));

  // recordId = keccak256 of the canonical JSON
  const canonical = JSON.stringify({
    imageSha256: record.imageSha256,
    faceDescriptorHash: record.faceDescriptorHash,
    postUrl: record.postUrl,
    postImageSha256: record.postImageSha256,
    similarityScore: record.similarityScore,
    timestampIso: record.timestampIso,
  });
  const recordId = keccak256(toUtf8Bytes(canonical));

  return {
    merkleRoot: root,
    recordId,
    leaves,
    proofs,
    fieldNames: FIELD_NAMES as string[],
  };
}

export function verifyLeafProof(
  leaf: string,
  proof: string[],
  root: string
): boolean {
  let current = leaf;
  for (const sibling of proof) {
    current = hashPair(current, sibling);
  }
  return current === root;
}
