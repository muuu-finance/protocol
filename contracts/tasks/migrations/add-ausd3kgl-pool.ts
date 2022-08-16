import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

type EthereumAddress = `0x${string}`

// Parameters
const POOL_NAME = "ausd3kgl"
type Param = {
  gauge: EthereumAddress | null
  lpToken: EthereumAddress | null
}
const PARAMS: {
  astar: Param, shiden: Param, localhost: Param
} = {
  astar: {
    gauge: "0xe6bA40C9686a05a2841829f98b5dF9cd6E3300A9",
    lpToken: "0xe12332a6118832CBAfC1913Ec5D8C3a05E6Fd880"
  },
  shiden: {
    gauge: null,
    lpToken: null
  },
  localhost: {
    gauge: null,
    lpToken: null
  }
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

  const networkName = _network.name as keyof typeof PARAMS
  const gauge = PARAMS[networkName].gauge
  if (gauge == null) throw new Error(`[ERROR] gauge's address is null`)

  await hre.run(`add-pool-extended-version`, {
    deployerAddress: _deployer.address,
    poolName: POOL_NAME,
    gaugeAddress: gauge,
    networkName: networkName
  })
  console.log(`--- [add-${POOL_NAME}-pool] FINISHED ---`)
})

task(
  `force-add-${POOL_NAME}-pool`,
  'add pool to expand add-pool migration'
)
.addOptionalParam('deployerAddress', "Deployer's address")
.setAction(async ({ deployerAddress }: { deployerAddress: string }, hre: HardhatRuntimeEnvironment) => {
  console.log(`--- [force-add-${POOL_NAME}-pool] START ---`)
  const { ethers, network: _network } = hre

  const _deployer =
    (await ethers.getSigner(deployerAddress)) ||
    (await ethers.getSigners())[0]

  const networkName = _network.name as keyof typeof PARAMS
  const param = PARAMS[networkName]
  if (param.gauge == null) throw new Error(`[ERROR] gauge's address is null`)
  if (param.lpToken == null) throw new Error(`[ERROR] lpToken's address is null`)

  await hre.run(`force-add-pool-extended-version`, {
    deployerAddress: _deployer.address,
    poolName: POOL_NAME,
    gaugeAddress: param.gauge,
    lpTokenAddress: param.lpToken,
    networkName: networkName
  })
  console.log(`--- [force-add-${POOL_NAME}-pool] FINISHED ---`)
})
