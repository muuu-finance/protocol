import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

type EthereumAddress = `0x${string}`

// Parameters
const POOL_NAME = "bai3kgl"
const GAUGE: { astar: EthereumAddress, shiden: EthereumAddress, localhost: EthereumAddress } = {
  astar: "0x9C8B44d5179502e651D95597ac3E9308B2e2f6C0",
  shiden: "0x9D2070D930005553D2994A202BB17C80053A4e00",
  localhost: "0xTBD"
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
  
  const networkName = _network.name as keyof typeof GAUGE
  const gauge = GAUGE[networkName]
  if (gauge == null) throw new Error(`[ERROR] gauge's address is null`)

  await hre.run(`add-pool-extended-version`, {
    deployerAddress: _deployer.address,
    poolName: POOL_NAME,
    gaugeAddress: gauge,
    networkName: networkName
  })
  console.log(`--- [add-${POOL_NAME}-pool] FINISHED ---`)
})
