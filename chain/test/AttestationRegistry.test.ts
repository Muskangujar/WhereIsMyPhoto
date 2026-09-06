import { expect } from "chai";
import { ethers } from "hardhat";
import { AttestationRegistry } from "../typechain-types";

describe("AttestationRegistry", () => {
  let registry: AttestationRegistry;
  const recordId = ethers.keccak256(ethers.toUtf8Bytes("test-record-1"));
  const merkleRoot = ethers.keccak256(ethers.toUtf8Bytes("merkle-root-1"));

  beforeEach(async () => {
    const Factory = await ethers.getContractFactory("AttestationRegistry");
    registry = (await Factory.deploy()) as AttestationRegistry;
    await registry.waitForDeployment();
  });

  it("attests a new record and emits Attested event", async () => {
    const [signer] = await ethers.getSigners();
    await expect(registry.attest(recordId, merkleRoot))
      .to.emit(registry, "Attested")
      .withArgs(recordId, merkleRoot, signer.address, await ethers.provider.getBlock("latest").then((b) => b!.timestamp + 1));
  });

  it("stores and retrieves the attestation correctly", async () => {
    const [signer] = await ethers.getSigners();
    await registry.attest(recordId, merkleRoot);
    const [root, attester, ts] = await registry.getAttestation(recordId);
    expect(root).to.equal(merkleRoot);
    expect(attester).to.equal(signer.address);
    expect(ts).to.be.gt(0);
  });

  it("reverts on duplicate attest", async () => {
    await registry.attest(recordId, merkleRoot);
    await expect(registry.attest(recordId, merkleRoot)).to.be.revertedWith(
      "AttestationRegistry: already attested"
    );
  });

  it("reverts on zero merkle root", async () => {
    await expect(
      registry.attest(recordId, ethers.ZeroHash)
    ).to.be.revertedWith("AttestationRegistry: zero merkle root");
  });

  it("returns zero values for unknown recordId", async () => {
    const unknown = ethers.keccak256(ethers.toUtf8Bytes("never-attested"));
    const [root, attester, ts] = await registry.getAttestation(unknown);
    expect(root).to.equal(ethers.ZeroHash);
    expect(attester).to.equal(ethers.ZeroAddress);
    expect(ts).to.equal(0);
  });

  it("allows different recordIds to be attested independently", async () => {
    const id2 = ethers.keccak256(ethers.toUtf8Bytes("record-2"));
    const root2 = ethers.keccak256(ethers.toUtf8Bytes("root-2"));
    await registry.attest(recordId, merkleRoot);
    await registry.attest(id2, root2);
    const [r1] = await registry.getAttestation(recordId);
    const [r2] = await registry.getAttestation(id2);
    expect(r1).to.equal(merkleRoot);
    expect(r2).to.equal(root2);
  });
});
