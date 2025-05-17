import { ethers } from "hardhat";

async function main() {
  console.log("Deploying Soulbound Certificate contract...");

  const SoulboundCertificate = await ethers.getContractFactory("SoulboundCertificate");
  const soulboundCertificate = await SoulboundCertificate.deploy();

  await soulboundCertificate.waitForDeployment();

  const address = await soulboundCertificate.getAddress();
  console.log(`Soulbound Certificate deployed to: ${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 