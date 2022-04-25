import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

// Parameters
const POOL_NAME = "Xxx"
const CONSTANTS_POOLS_INDEX = {
  astar: null,
  shiden: null,
  localhost: 0
}

task(
  `add-${POOL_NAME}-pool`,
  'add pool to expand add-pool migration'
)
.addOptionalParam('deployerAddress', "Deployer's address")
.setAction(async ({ deployerAddress }: { deployerAddress: string }, hre: HardhatRuntimeEnvironment) => {
  const { ethers, network: _network } = hre

  const _deployer =
    (await ethers.getSigner(deployerAddress)) ||
    (await ethers.getSigners())[0]
  
  const networkName = _network.name as keyof typeof CONSTANTS_POOLS_INDEX
  const constantsPoolIndex = CONSTANTS_POOLS_INDEX[networkName]
  if (!constantsPoolIndex) return

  await hre.run(`add-pool-extended-version`, {
    deployerAddress: _deployer.address,
    poolName: POOL_NAME,
    constantsPoolIndex: constantsPoolIndex.toString(),
    networkName: networkName
  })
})