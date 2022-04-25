import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { Booster__factory } from '../../types'
import { loadConstants } from '../constants'
import { TaskUtils } from '../utils'

// Parameters
const POOL_NAME = "Xxx"
const CONSTANTS_POOLS_INDEX: { [key in SupportedNetwork]: number } = {
  astar: 0,
  shiden: 0,
  localhost: 0
}

const SUPPORTED_NETWORK = ["astar", "shiden", "localhost"] as const
type SupportedNetwork = typeof SUPPORTED_NETWORK[number]

task(
  `add-${POOL_NAME}-pool`,
  'add pool to expand add-pool migration'
)
.addOptionalParam('deployerAddress', "Deployer's address")
.setAction(async ({ deployerAddress }: { deployerAddress: string }, hre: HardhatRuntimeEnvironment) => {
  const { ethers, network: _network } = hre

  if (!(SUPPORTED_NETWORK as ReadonlyArray<string>).includes(_network.name)) throw new Error(`Support only ${SUPPORTED_NETWORK} ...`)
  const network = _network.name as SupportedNetwork

  const _deployer =
    (await ethers.getSigner(deployerAddress)) ||
    (await ethers.getSigners())[0]
  
  const constantsPoolIndex = CONSTANTS_POOLS_INDEX[network]
  
  const { system } = TaskUtils.loadDeployedContractAddresses({ network: network })
  const { pools } = loadConstants({ 
    network: network,
    isUseMocks: false
  })
  if (!pools || !pools[constantsPoolIndex]) throw new Error(`Could not get pools from constants`)
  const gauge = pools[constantsPoolIndex].gauge

  const booster = Booster__factory.connect(system.booster, ethers.provider)
  const poolLength = await booster.poolLength()
  const addedPools = await Promise.all(
    [...Array(poolLength.toNumber())].map(
      (_, i) => booster.poolInfo(i)
    )
  )
  const addedGauges = addedPools.map(v => v.gauge)
  if (addedGauges.some(v => v.toLowerCase() == gauge.toLowerCase())) throw new Error(`Selected gauge has already been added`)

  await hre.run(`add-pool`, {
    deployerAddress: _deployer.address,
    poolName: POOL_NAME,
    poolManagerAddress: system.poolManagerV3,
    gauge: gauge
  })
})