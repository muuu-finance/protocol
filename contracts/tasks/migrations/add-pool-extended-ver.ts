import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Booster, Booster__factory } from "../../types";
import { loadConstants } from "../constants";
import { DeployedContractAddresses } from "../types";
import { TaskUtils } from "../utils";

const SUPPORTED_NETWORK = ["astar", "shiden", "localhost"] as const
type SupportedNetwork = typeof SUPPORTED_NETWORK[number]

const validateNetwork = (network: string): SupportedNetwork => {
  if (!(SUPPORTED_NETWORK as ReadonlyArray<string>).includes(network)) throw new Error(`Support only ${SUPPORTED_NETWORK} ...`)
  return network as SupportedNetwork
}
const checkConstantsPools = (network: string, gauge: string) => {
  const { pools } = loadConstants({ 
    network: network,
    isUseMocks: false
  })

  if (!pools || !pools.some(p => p.gauge.toLowerCase() == gauge.toLowerCase())) throw new Error(`Could not get pools from constants`)
}
const checkPoolsInBooster = async (instance: Booster, poolLength: number, gauge: string, lpToken?: string) => {
  const addedPools = await Promise.all(
    [...Array(poolLength)].map(
      (_, i) => instance.poolInfo(i)
    )
  )
  const addedGauges = addedPools.map(v => v.gauge)
  if (addedGauges.some(v => v.toLowerCase() == gauge.toLowerCase())) throw new Error(`Selected gauge has already been added`)
  if (lpToken) {
    const addedLptokens = addedPools.map(v => v.lptoken)
    if (addedLptokens.some(v => v.toLowerCase() == lpToken.toLowerCase())) throw new Error(`Selected lptoken has already been added`)
  }
}
const logDeployedPools = async (
  instance: Booster,
  poolLength: number,
  poolName: string,
  deployedPools: DeployedContractAddresses["pools"],
  network: string
) => {
  const poolInfo = await instance.poolInfo(poolLength)
  const data = {
    lptoken: poolInfo.lptoken,
    token: poolInfo.token,
    gauge: poolInfo.gauge,
    kglRewards: poolInfo.kglRewards,
    stash: poolInfo.stash,
    rewards: [],
    name: poolName,
    id: poolLength
  }
  const _deployedPools = deployedPools.concat([data])
  console.log(_deployedPools)
  TaskUtils.writeValueToGroup(
    'pools',
    _deployedPools,
    TaskUtils.getFilePath({ network }),
  )
}

/**
 * extended version of `add-pool` task 
 * - To be able to add pool individually
 *   - Process simple inputs to arguments for using common `add-pool` task
 *   - Need to use this from other task for adding each pool
 * - execute `add-pool` task & logging
 */
task('add-pool-extended-version', 'add-pool-extended-version')
  .addParam('deployerAddress', "Deployer's address")
  .addParam('poolName', "Pool's name")
  .addParam('gaugeAddress', 'gauge address')
  .addParam('networkName', 'Network name')
  .setAction(async ({
    deployerAddress,
    poolName,
    gaugeAddress,
    networkName
  }: {
    deployerAddress: string
    poolName: string
    gaugeAddress: string
    networkName: string
  }, hre: HardhatRuntimeEnvironment) => {
    if (!(SUPPORTED_NETWORK as ReadonlyArray<string>).includes(networkName)) throw new Error(`Support only ${SUPPORTED_NETWORK} ...`)
    const network = validateNetwork(networkName)
    const { ethers } = hre
    const { system, pools: deployedPools } = TaskUtils.loadDeployedContractAddresses({ network: network })

    checkConstantsPools(network, gaugeAddress)

    const instance = Booster__factory.connect(system.booster, ethers.provider)
    const poolLength = await instance.poolLength()

    await checkPoolsInBooster(
      instance,
      poolLength.toNumber(),
      gaugeAddress
    )

    // execute
    await hre.run(`add-pool`, {
      deployerAddress: deployerAddress,
      poolName: poolName,
      poolManagerAddress: system.poolManagerV3,
      gauge: gaugeAddress
    })

    // confirm
    await logDeployedPools(
      instance,
      poolLength.toNumber(),
      poolName,
      deployedPools,
      network,
    )
  })

/**
 * extended version of `force-add-pool` task
 */
task('force-add-pool-extended-version', 'add-pool-extended-version')
  .addParam('deployerAddress', "Deployer's address")
  .addParam('poolName', "Pool's name")
  .addParam('gaugeAddress', 'gauge address')
  .addParam('lpTokenAddress', 'lpToken address')
  .addParam('networkName', 'Network name')
  .setAction(async ({
    deployerAddress,
    poolName,
    gaugeAddress,
    lpTokenAddress,
    networkName
  }: {
    deployerAddress: string
    poolName: string
    gaugeAddress: string
    lpTokenAddress: string
    networkName: string
  }, hre: HardhatRuntimeEnvironment) => {
    const network = validateNetwork(networkName)
    const { ethers } = hre
    const { system, pools: deployedPools } = TaskUtils.loadDeployedContractAddresses({ network: network })

    checkConstantsPools(network, gaugeAddress)

    const instance = Booster__factory.connect(system.booster, ethers.provider)
    const poolLength = await instance.poolLength()

    await checkPoolsInBooster(
      instance,
      poolLength.toNumber(),
      gaugeAddress,
      lpTokenAddress
    )

    // execute
    await hre.run(`force-add-pool`, {
      deployerAddress: deployerAddress,
      poolName: poolName,
      poolManagerAddress: system.poolManagerV3,
      gauge: gaugeAddress,
      lpToken: lpTokenAddress
    })

    // confirm
    await logDeployedPools(
      instance,
      poolLength.toNumber(),
      poolName,
      deployedPools,
      network,
    )
  })
