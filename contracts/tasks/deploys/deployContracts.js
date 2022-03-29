const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants")
const { task } = require("hardhat/config")

task("deploy-contracts", "Deploy contracts").setAction(async (args, hre) => {
  console.log(`network: ${hre.network.name}`)
  const [signer] = await hre.ethers.getSigners()
  console.log(`deployer: ${await signer.getAddress()}`)

  const MuuuToken = await hre.ethers.getContractFactory("MuuuToken")
  const muuuToken = await MuuuToken.deploy(ZERO_ADDRESS);
  await muuuToken.deployed();
  console.log(`MuuuToken deployed to: ${muuuToken.address}`);

  const MuKglToken = await hre.ethers.getContractFactory("MuKglToken")
  const muKglToken = await MuKglToken.deploy();
  await muKglToken.deployed();
  console.log(`MuKglToken deployed to: ${muKglToken.address}`);

  const MuuuLockerV2 = await hre.ethers.getContractFactory("MuuuLockerV2")
  const muuuLockerV2 = await MuuuLockerV2.deploy();
  await muuuLockerV2.deployed();
  console.log(`MuuuLockerV2 deployed to: ${muuuLockerV2.address}`);
})
