// scripts/upgrade.js
const { ethers, upgrades } = require("hardhat");

async function main() {
  if (!process.env.NEXT_CONTRACT_NAME) {
    console.log("env NEXT_CONTRACT_NAME is required.")
    return;
  }
  if (!process.env.PROXY_ADDRESS) {
    console.log("env PROXY_ADDRESS is required.")
    return;
  }
  const Uni2faNext = await ethers.getContractFactory(process.env.NEXT_CONTRACT_NAME);
  const uni2fa = await upgrades.upgradeProxy(process.env.PROXY_ADDRESS, Uni2faNext);
  console.log("Contract upgraded");
  console.log(`Uni2fa proxy address: ${uni2fa.address}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });