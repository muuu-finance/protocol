import { task } from "hardhat/config"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { Booster__factory } from "../../types"
import { TaskUtils } from "../utils"

// yarn hardhat execute-earmark-one-pool --id N --network astar
task(
  'execute-earmark-one-pool',
  'Execute earmarkRewards to selected pool'
)
.addParam('id', 'poolId')
.setAction(async ({ id }, hre: HardhatRuntimeEnvironment) => {
  const { ethers, network } = hre
  const _deployer = (await ethers.getSigners())[0]

  const { system } = TaskUtils.loadDeployedContractAddresses({
    network: network.name,
  })

  const booster = await Booster__factory.connect(system.booster, _deployer)
  const tx = await booster.earmarkRewards(Number(id))
  await tx.wait()
})