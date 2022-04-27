import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

// Parameters
const POOL_NAME = "astriddao"
const CONSTANTS_POOLS_INDEX = {
  astar: null,
  shiden: null,
  localhost: 0
}

/**
 * Template task to add pool to protocol
 * - This task takes responsibility to convert parameter about adding pool
 *   - Transfer actual processing to `add-pool-extended-version` task
 * - Operator need
 *   - modify Parameters (defined above)
 *   - update constants (key is `pools`) for each network
 */
task(
  `add-${POOL_NAME}-pool`,
  'add pool to expand add-pool migration'
)
.addOptionalParam('deployerAddress', "Deployer's address")
.setAction(async ({ deployerAddress }: { deployerAddress: string }, hre: HardhatRuntimeEnvironment) => {
  console.log(`--- [add-${POOL_NAME}-pool] START ---`)
  const { ethers, network: _network } = hre

  const _deployer =
    (await ethers.getSigner(deployerAddress)) ||
    (await ethers.getSigners())[0]
  
  const networkName = _network.name as keyof typeof CONSTANTS_POOLS_INDEX
  const constantsPoolIndex = CONSTANTS_POOLS_INDEX[networkName]
  if (constantsPoolIndex == null) throw new Error(`[ERROR] constants pool index is null`)

  await hre.run(`add-pool-extended-version`, {
    deployerAddress: _deployer.address,
    poolName: POOL_NAME,
    constantsPoolIndex: constantsPoolIndex.toString(),
    networkName: networkName
  })
  console.log(`--- [add-${POOL_NAME}-pool] FINISHED ---`)
})
