import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Booster__factory } from "../../types";
import { loadConstants } from "../constants";
import { TaskUtils } from "../utils";

const SUPPORTED_NETWORK = ["astar", "shiden", "localhost"] as const
type SupportedNetwork = typeof SUPPORTED_NETWORK[number]

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
  .addParam('constantsPoolIndex', 'index of pools constants in environment constants file')
  .addParam('networkName', 'Network name')
  .setAction(async ({
    deployerAddress,
    poolName,
    constantsPoolIndex,
    networkName
  }: {
    deployerAddress: string
    poolName: string
    constantsPoolIndex: string
    networkName: string
  }, hre: HardhatRuntimeEnvironment) => {
    if (!(SUPPORTED_NETWORK as ReadonlyArray<string>).includes(networkName)) throw new Error(`Support only ${SUPPORTED_NETWORK} ...`)
    const { ethers } = hre
    const network = networkName as SupportedNetwork

    const { system } = TaskUtils.loadDeployedContractAddresses({ network: network })
    const { pools } = loadConstants({ 
      network: network,
      isUseMocks: false
    })
    const _constantsPoolIndex = Number(constantsPoolIndex)
    if (!pools || !pools[_constantsPoolIndex]) throw new Error(`Could not get pools from constants`)
    const gauge = pools[_constantsPoolIndex].gauge

    const instance = Booster__factory.connect(system.booster, ethers.provider)
    const poolLength = await instance.poolLength()
    const addedPools = await Promise.all(
      [...Array(poolLength.toNumber())].map(
        (_, i) => instance.poolInfo(i)
      )
    )
    const addedGauges = addedPools.map(v => v.gauge)
    if (addedGauges.some(v => v.toLowerCase() == gauge.toLowerCase())) throw new Error(`Selected gauge has already been added`)

    // execute
    await hre.run(`add-pool`, {
      deployerAddress: deployerAddress,
      poolName: poolName,
      poolManagerAddress: system.poolManagerV3,
      gauge: gauge
    })

    // confirm
    const poolInfo = await instance.poolInfo(poolLength.toNumber())
    const data = {
      lptoken: poolInfo.lptoken,
      token: poolInfo.token,
      gauge: poolInfo.gauge,
      kglRewards: poolInfo.kglRewards,
      stash: poolInfo.stash,
      shutdown: poolInfo.shutdown
    }
    console.log(data)
  })