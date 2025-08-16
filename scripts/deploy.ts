import hre from "hardhat";

async function main() {
  const PlayerRegistry = await hre.ethers.getContractFactory("PlayerRegistry");
  const playerRegistry = await PlayerRegistry.deploy();

  await playerRegistry.waitForDeployment();

  const contractAddress = await playerRegistry.getAddress();
  console.log(`PlayerRegistry deployed to: ${contractAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
