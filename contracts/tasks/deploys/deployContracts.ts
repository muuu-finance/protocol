import { task } from "hardhat/config"
import { HardhatRuntimeEnvironment } from "hardhat/types"

task("deploy-contracts", "Deploy contracts").setAction(async ({}, hre: HardhatRuntimeEnvironment) => {
  const { network, ethers } = hre
  console.log(`network: ${network.name}`)
  const [signer] = await ethers.getSigners()
  console.log(`deployer: ${await signer.getAddress()}`)

  const MuuuToken = await ethers.getContractFactory("MuuuToken")
  const muuuToken = await MuuuToken.deploy(ethers.constants.AddressZero);
  await muuuToken.deployed();
  console.log(`MuuuToken deployed to: ${muuuToken.address}`);

  const MuKglToken = await ethers.getContractFactory("MuKglToken")
  const muKglToken = await MuKglToken.deploy();
  await muKglToken.deployed();
  console.log(`MuKglToken deployed to: ${muKglToken.address}`);

  const MuuuLockerV2 = await ethers.getContractFactory("MuuuLockerV2")
  const muuuLockerV2 = await MuuuLockerV2.deploy();
  await muuuLockerV2.deployed();
  console.log(`MuuuLockerV2 deployed to: ${muuuLockerV2.address}`);
})
