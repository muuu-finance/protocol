import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { TaskUtils } from '../utils';

task(
  'deploy-booster-owner-with-transfering-roles',
  'Deploy BoosterOwner & transfer roles'
).setAction(async ({}, hre: HardhatRuntimeEnvironment) => {
  console.log(`--- [deploy-booster-owner-with-transfering-roles] START ---`)
  const { network, ethers } = hre
  console.log(`network: ${network.name}`)
  const [signer] = await ethers.getSigners()
  console.log(`deployer: ${await signer.getAddress()}`)

  const deployeds = TaskUtils.loadDeployedContractAddresses({
    network: network.name,
  })

  console.log(`--- start: deployments ---`)
  // TODO
  console.log(`--- finish: deployments ---`)

  console.log(`--- start: transfer role ---`)
  // TODO
  console.log(`--- finish: transfer role ---`)

  console.log(
    TaskUtils.loadDeployedContractAddresses({ network: network.name }),
  )
  console.log(`--- [deploy-booster-owner-with-transfering-roles] FINISHED ---`)
})