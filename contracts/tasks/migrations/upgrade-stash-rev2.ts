import { subtask, task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { deployExtraRewardStashV3Rev2, deployStashFactoryV2Rev2 } from "../../helpers/contracts-deploy-helpers";
import { Booster__factory } from "../../types";
import { StashFactoryV2Rev2__factory } from "../../types/factories/StashFactoryV2Rev2__factory";
import { loadConstants } from "../constants";
import { ContractJsonGroups, ContractKeys, TaskUtils } from "../utils";

const setup = async (hre: HardhatRuntimeEnvironment, deployerAddress?: string) => {
  const { network, ethers } = hre
  const deployer = deployerAddress
    ? (await ethers.getSigner(deployerAddress))
    : (await ethers.getSigners())[0]
  const deployeds = TaskUtils.loadDeployedContractAddresses({
    network: network.name,
  })
  const constants = loadConstants({
    network: network.name,
    isUseMocks: false,
  })
  return {
    network,
    ethers,
    deployer,
    deployeds,
    constants
  }
}

task(
  "upgrade-stash-rev2",
  "upgrade-stash-rev2"
).setAction(async ({}, hre: HardhatRuntimeEnvironment) => {
  const { network, deployer } = await setup(hre)
  console.log(`--- [upgrade-stash-rev2] START ---`)
  console.log(`network.name ... ${network.name}`)
  console.log(`deployer ... ${deployer.address}`)

  await hre.run("upgrade-stash-rev2:deploy", {});
  await hre.run("upgrade-stash-rev2:setup", {});

  console.log(`--- [upgrade-stash-rev2] FINISHED ---`)
})

subtask(
  "upgrade-stash-rev2:deploy",
  "upgrade-stash-rev2:deploy"
).setAction(async ({}, hre: HardhatRuntimeEnvironment) => {
  console.log(`--- [upgrade-stash-rev2:deploy] START ---`)
  const { network, deployer, deployeds: { system }, constants } = await setup(hre)

  console.log(`> start deploy ${ContractKeys.StashFactoryV2Rev2}`)
  const sFactoryInstance = await deployStashFactoryV2Rev2({
    deployer: deployer,
    operator: system.booster,
    rewardFactory: system.rFactory,
    proxyFactory: system.proxyFactory,
    kgl: constants.tokens.KGL
  })
  TaskUtils.writeContractAddress({
    group: ContractJsonGroups.system,
    name: 'sFactoryV2Rev2',
    value: sFactoryInstance.address,
    fileName: TaskUtils.getFilePath({ network: network.name }),
  })
  console.log(`>> deployed ${ContractKeys.StashFactoryV2Rev2}\n`)

  console.log(`> deploy ${ContractKeys.ExtraRewardStashV3Rev2} for setting to StashFactoryV2Rev2`)
  const v3Impl = await deployExtraRewardStashV3Rev2({ deployer })
  TaskUtils.writeContractAddress({
    group: ContractJsonGroups.system,
    name: 'extraRewardStashV3Rev2',
    value: v3Impl.address,
    fileName: TaskUtils.getFilePath({ network: network.name }),
  })
  console.log(`>> deployed ${ContractKeys.ExtraRewardStashV3Rev2}\n`)
})

subtask(
  "upgrade-stash-rev2:setup",
  "upgrade-stash-rev2:setup"
).setAction(async ({}, hre: HardhatRuntimeEnvironment) => {
  console.log(`--- [upgrade-stash-rev2:setup] START ---`)
  const { deployer, deployeds: { system } } = await setup(hre)

  // ref: #_setImplementationToStashFactory in tasks/series/all-required-deployments.ts
  const _instance = StashFactoryV2Rev2__factory.connect(system.sFactoryV2Rev2, deployer)
  console.log('> StashFactoryV2Rev2#setImplementation')
  await (await _instance.setImplementation(system.extraRewardStashV3Rev2)).wait()

  // ref: #_prepareAfterDeployingPoolManager in tasks/series/all-required-deployments.ts
  const _boosterInstance = await Booster__factory.connect(system.booster, deployer)
  console.log('> Booster#setFactories')
  await (
    await _boosterInstance.setFactories(
      system.rFactory,
      system.sFactoryV2Rev2,
      system.tFactory,
    )
  ).wait()
})
