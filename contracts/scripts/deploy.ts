import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const owner = process.env.CAP_TABLE_OWNER || deployer.address;

  console.log(`Deploying CapTable with owner ${owner} (deployer: ${deployer.address})`);

  const CapTable = await ethers.getContractFactory("CapTable");
  const capTable = await CapTable.deploy(owner);
  await capTable.waitForDeployment();

  const address = await capTable.getAddress();
  console.log(`CapTable deployed at: ${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
