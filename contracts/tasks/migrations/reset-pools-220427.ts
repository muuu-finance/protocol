import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Booster, Booster__factory, PoolManagerV3__factory } from "../../types";
import { TaskUtils } from "../utils";

const SUPPORTED_NETWORK = ["astar", "shiden", "localhost"] as const
type SupportedNetwork = typeof SUPPORTED_NETWORK[number]
type EthereumAddress = `0x${string}`

const REMOVING_POOLS: { poolIndex: number, gauge: EthereumAddress }[] = []
const ADDING_GAUGES: EthereumAddress[] = []

task(
  "reset-pools-220427",
  'reset-pools-220427'
).addParam(
  'deployerAddress',
  "Deployer's address"
).setAction(async ({ deployerAddress }: { deployerAddress: string }, hre: HardhatRuntimeEnvironment) => {
  const { ethers, network: _network } = hre
  if (!(SUPPORTED_NETWORK as ReadonlyArray<string>).includes(_network.name)) throw new Error(`Support only ${SUPPORTED_NETWORK} ...`)
  const networkName = _network.name as SupportedNetwork
  const _deployer =
    (await ethers.getSigner(deployerAddress)) ||
    (await ethers.getSigners())[0]

  console.log(`--- [reset-pools-220427] START ---`)
  console.log(`network name ... ${networkName}`)
  console.log(`deployer ... ${_deployer.address}`)

  const { system } = TaskUtils.loadDeployedContractAddresses({ network: networkName })
  const _booster = Booster__factory.connect(system.booster, _deployer)
  const _poolManagerV3 = PoolManagerV3__factory.connect(system.poolManagerV3, _deployer)
  
  // validations
  console.log(`--- START validations`)
  if (REMOVING_POOLS.length !== ADDING_GAUGES.length) throw new Error("Not match length - adding gauges, removing gauges")
  for (const removingPool of REMOVING_POOLS) {
    const addedPool = await _booster.poolInfo(removingPool.poolIndex)
    if (addedPool.shutdown) throw new Error(`Already shutdown: ${addedPool}`)
    if (addedPool.gauge.toLowerCase() !== removingPool.gauge.toLowerCase()) throw new Error(`Not match gauge address from Booster#poolInfo: ${removingPool}`)
    if (ADDING_GAUGES.some(addingGauge => addingGauge.toLowerCase() === addedPool.gauge.toLowerCase())) throw new Error(`Include adding gauge address in current pools: ${addedPool}`)
  }
  console.log(`--- FINISH validations`)

  // shotdown
  console.log(`--- START shotdown`)
  for await (const removingPool of REMOVING_POOLS) {
    const tx = await _poolManagerV3.shutdownPool(removingPool.poolIndex)
    await tx.wait()
    console.log(`> shotdown: ${removingPool}`)
  }
  console.log(`--- FINISH shotdown`)

  // add pool
  console.log(`--- START add pool`)
  for await (const gauge of ADDING_GAUGES) {
    const tx = await _poolManagerV3.functions["addPool(address)"](gauge)
    await tx.wait()
    console.log(`> add pool: ${gauge}`)
  }
  console.log(`--- FINISH add pool`)

  // confirmation current pools
  await confirmCurrentPools(_booster)
  console.log(`--- [reset-pools-220427] FINISHED ---`)
})

const confirmCurrentPools = async (instance: Booster) => {
  const _poolLength = await instance.poolLength()
  console.log(`poolLength ... ${_poolLength.toNumber()}`)
  const result = []
  for (let i = 0; i < _poolLength.toNumber(); i++) {
    const poolInfo = await instance.poolInfo(i)
    const { lptoken, token, gauge, kglRewards, stash, shutdown } = poolInfo
    result.push({
      lptoken,
      token,
      gauge,
      kglRewards,
      stash,
      shutdown
    })
  }
}