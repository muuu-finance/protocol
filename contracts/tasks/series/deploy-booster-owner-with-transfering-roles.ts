import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { BoosterOwner__factory, Booster__factory } from '../../types';
import { ContractKeys, TaskUtils } from '../utils';

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
  const boosterOwnerAddress = await hre.run(
    `deploy-${ContractKeys.BoosterOwner}`,
    {
      deployerAddress: signer.address,
      inMultiDeploymentFlow: true,
      useAlreadyDeployed: false,
    }
  )
  console.log(`--- finish: deployments ---`)

  console.log(`--- start: transfer role ---`)
  const boosterOwner = BoosterOwner__factory.connect(boosterOwnerAddress, signer)
  const booster = Booster__factory.connect(deployeds.system.booster, signer)
  await (await booster.transferOwnership(boosterOwnerAddress))
  const newBoosterOwner = await booster.owner()
  console.log(`check: booster's owner = ${newBoosterOwner}`)
  if (newBoosterOwner.toLowerCase() != boosterOwnerAddress.toLowerCase()) {
    console.log("[ERROR] Premine total does not match to calculated total from holders")
    throw new Error("[ERROR] current booster's owner is not BoosterOwner address after Booster#transferOwner")
  }
  // TODO: transfer BoosterOwner's owner to admin address?
  await (await boosterOwner.sealOwnership())
  console.log(`--- finish: transfer role ---`)

  console.log(
    TaskUtils.loadDeployedContractAddresses({ network: network.name }),
  )
  console.log(`--- [deploy-booster-owner-with-transfering-roles] FINISHED ---`)
})
