// Chain interaction utilities shared between API routes and the CLI pipeline.
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { DiscoveryRecord, buildDiscoveryMerkle } from "./merkle";

const CHAIN_DIR = path.resolve(process.cwd(), "chain");
const DEPLOYMENT_PATH = path.join(CHAIN_DIR, "deployment.json");

const ABI = [
  "function attest(bytes32 recordId, bytes32 merkleRoot) external",
  "function getAttestation(bytes32 recordId) external view returns (bytes32 merkleRoot, address attester, uint64 timestamp)",
  "event Attested(bytes32 indexed recordId, bytes32 merkleRoot, address attester, uint256 timestamp)",
];

export interface DeploymentInfo {
  address: string;
  chainId: number;
  network: string;
  txHash?: string;
}

export function loadDeployment(network: string): DeploymentInfo | null {
  try {
    if (!fs.existsSync(DEPLOYMENT_PATH)) return null;
    const all = JSON.parse(fs.readFileSync(DEPLOYMENT_PATH, "utf-8"));
    return all[network] ?? null;
  } catch {
    return null;
  }
}

export function getProvider(network: string): ethers.JsonRpcProvider {
  if (network === "localhost") {
    return new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  }
  if (network === "amoy") {
    const rpc = process.env.AMOY_RPC_URL ?? "https://rpc-amoy.polygon.technology";
    return new ethers.JsonRpcProvider(rpc);
  }
  throw new Error(`Unknown network: ${network}`);
}

export function getSigner(provider: ethers.JsonRpcProvider, network: string): ethers.Wallet {
  if (network === "localhost") {
    // Hardhat node well-known dev account #0
    const DEV_KEY =
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    return new ethers.Wallet(DEV_KEY, provider);
  }
  const pk = process.env.PRIVATE_KEY;
  if (!pk) {
    throw new Error(
      "PRIVATE_KEY env var is not set.\n" +
        "Create a throwaway wallet and set PRIVATE_KEY=0x... in .env\n" +
        "See BEFORE SUBMISSION in README."
    );
  }
  return new ethers.Wallet(pk, provider);
}

export interface AttestResult {
  txHash: string;
  blockNumber: number;
  recordId: string;
  merkleRoot: string;
  explorerUrl: string | null;
  eip712Signature: string;
}

export async function attestRecord(
  record: DiscoveryRecord,
  network: string
): Promise<AttestResult> {
  const deployment = loadDeployment(network);
  if (!deployment) {
    throw new Error(
      `No deployment found for network '${network}'. ` +
        `Run: cd chain && npx hardhat run scripts/deploy.ts --network ${network}`
    );
  }

  const provider = getProvider(network);
  const signer = getSigner(provider, network);
  const contract = new ethers.Contract(deployment.address, ABI, signer);

  const { merkleRoot, recordId } = buildDiscoveryMerkle(record);

  // EIP-712 typed signature over the record
  const domain712 = {
    name: "WhereIsMyPhoto",
    version: "1",
    chainId: deployment.chainId,
    verifyingContract: deployment.address,
  };
  const types712 = {
    DiscoveryRecord: [
      { name: "imageSha256", type: "string" },
      { name: "faceDescriptorHash", type: "string" },
      { name: "postUrl", type: "string" },
      { name: "merkleRoot", type: "bytes32" },
      { name: "timestampIso", type: "string" },
    ],
  };
  const value712 = {
    imageSha256: record.imageSha256,
    faceDescriptorHash: record.faceDescriptorHash,
    postUrl: record.postUrl,
    merkleRoot,
    timestampIso: record.timestampIso,
  };
  const eip712Signature = await signer.signTypedData(domain712, types712, value712);

  const tx = await contract.attest(recordId, merkleRoot);
  const receipt = await tx.wait();

  let explorerUrl: string | null = null;
  if (network === "amoy") {
    explorerUrl = `https://amoy.polygonscan.com/tx/${receipt.hash}`;
  }

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    recordId,
    merkleRoot,
    explorerUrl,
    eip712Signature,
  };
}

export interface VerifyResult {
  pass: boolean;
  onChainRoot: string;
  computedRoot: string;
  attester: string;
  timestamp: number;
  eip712SignerMatch: boolean;
  eip712RecoveredSigner: string;
}

export async function verifyRecord(
  record: DiscoveryRecord,
  attestResult: AttestResult,
  network: string
): Promise<VerifyResult> {
  const deployment = loadDeployment(network);
  if (!deployment) throw new Error(`No deployment for '${network}'`);

  const provider = getProvider(network);
  const contract = new ethers.Contract(deployment.address, ABI, provider);

  const { merkleRoot: computedRoot, recordId } = buildDiscoveryMerkle(record);

  const [onChainRoot, attester, timestamp] = await contract.getAttestation(recordId);

  // Recover EIP-712 signer
  const domain712 = {
    name: "WhereIsMyPhoto",
    version: "1",
    chainId: deployment.chainId,
    verifyingContract: deployment.address,
  };
  const types712 = {
    DiscoveryRecord: [
      { name: "imageSha256", type: "string" },
      { name: "faceDescriptorHash", type: "string" },
      { name: "postUrl", type: "string" },
      { name: "merkleRoot", type: "bytes32" },
      { name: "timestampIso", type: "string" },
    ],
  };
  const value712 = {
    imageSha256: record.imageSha256,
    faceDescriptorHash: record.faceDescriptorHash,
    postUrl: record.postUrl,
    merkleRoot: computedRoot,
    timestampIso: record.timestampIso,
  };

  const recoveredSigner = ethers.verifyTypedData(
    domain712,
    types712,
    value712,
    attestResult.eip712Signature
  );

  const eip712SignerMatch =
    recoveredSigner.toLowerCase() === attester.toLowerCase();

  return {
    pass: onChainRoot === computedRoot && onChainRoot !== ethers.ZeroHash,
    onChainRoot,
    computedRoot,
    attester,
    timestamp: Number(timestamp),
    eip712SignerMatch,
    eip712RecoveredSigner: recoveredSigner,
  };
}
