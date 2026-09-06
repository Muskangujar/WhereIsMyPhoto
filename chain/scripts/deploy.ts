import { ethers, network } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying AttestationRegistry on '${network.name}' from ${deployer.address}`);

  const Factory = await ethers.getContractFactory("AttestationRegistry");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const txHash = contract.deploymentTransaction()?.hash ?? "";

  console.log(`  AttestationRegistry deployed to: ${address}`);
  console.log(`  Tx: ${txHash}`);

  // Persist deployment info
  const deploymentPath = path.resolve(__dirname, "../deployment.json");
  const existing = fs.existsSync(deploymentPath)
    ? JSON.parse(fs.readFileSync(deploymentPath, "utf-8"))
    : {};

  existing[network.name] = {
    address,
    chainId: Number(chainId),
    network: network.name,
    txHash,
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync(deploymentPath, JSON.stringify(existing, null, 2));
  console.log(`  Deployment info saved to chain/deployment.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
