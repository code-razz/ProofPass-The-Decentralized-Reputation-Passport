const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying contracts...");

  // Deploy SoulboundCertificate
  console.log("Deploying Soulbound Certificate contract...");
  const SoulboundCertificate = await ethers.getContractFactory("SoulboundCertificate");
  const soulboundCertificate = await SoulboundCertificate.deploy();
  await soulboundCertificate.waitForDeployment();
  const soulboundAddress = await soulboundCertificate.getAddress();
  console.log(`Soulbound Certificate deployed to: ${soulboundAddress}`);

  // Deploy OpportunityManager
  console.log("\nDeploying Opportunity Manager contract...");
  const OpportunityManager = await ethers.getContractFactory("OpportunityManager");
  const opportunityManager = await OpportunityManager.deploy();
  await opportunityManager.waitForDeployment();
  const opportunityAddress = await opportunityManager.getAddress();
  console.log(`Opportunity Manager deployed to: ${opportunityAddress}`);

  console.log("\nAdd these addresses to your .env.local file:");
  console.log(`NEXT_PUBLIC_SOULBOUND_CERTIFICATE_ADDRESS=${soulboundAddress}`);
  console.log(`NEXT_PUBLIC_OPPORTUNITY_MANAGER_ADDRESS=${opportunityAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 