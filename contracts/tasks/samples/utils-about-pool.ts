import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Booster, Booster__factory, MintableERC20__factory, MockKaglaGauge__factory, MockKaglaLiquidityGaugeV3__factory, PoolManagerV3__factory } from "../../types";
import { TaskUtils } from "../utils";

const SUPPORTED_NETWORK = ["localhost"] as const
type SupportedNetwork = typeof SUPPORTED_NETWORK[number]

const POOL_NAMES = [
  "3Pool",
  "Starlay 3Pool",
  "BUSD+3KGL",
  "astridDAO",
] 

task(
  "test-utils:add-pool:local",
  'test-utils:add-pool:local'
).setAction(async ({}, hre: HardhatRuntimeEnvironment) => {
  const { ethers, network: _network } = hre
  if (!(SUPPORTED_NETWORK as ReadonlyArray<string>).includes(_network.name)) throw new Error(`Support only ${SUPPORTED_NETWORK} ...`)
  const networkName = _network.name as SupportedNetwork
  const _deployer = (await ethers.getSigners())[0]

  console.log(`--- [test-utils:add-pool:local] START ---`)
  console.log(`network name ... ${networkName}`)
  console.log(`deployer ... ${_deployer.address}`)

  const { system } = TaskUtils.loadDeployedContractAddresses({ network: networkName })
  const _booster = Booster__factory.connect(system.booster, _deployer)
  
  for await (const [index, poolName] of POOL_NAMES.entries()) {
    const lpToken = await new MintableERC20__factory(_deployer).deploy(
      `${poolName} Token`,
      `SYMBOL${index + 1}`,
      18
    )
    await lpToken.deployTransaction.wait()
    const gauge = await new MockKaglaGauge__factory(_deployer).deploy(lpToken.address)
    await gauge.deployTransaction.wait()
    await hre.run(`add-pool`, {
      deployerAddress: _deployer.address,
      poolName,
      poolManagerAddress: system.poolManagerV3,
      gauge: gauge.address,
    })
    console.log(`> added pool`)
    console.log(` name = ${poolName}`)
    console.log(` gauge address = ${gauge.address}`)
    console.log(` lptoken address = ${lpToken.address}`)
  }
  
  // confirmation current pools
  console.log(`--- confirmation current pools`)
  await confirmCurrentPools(_booster)
  console.log(`--- [test-utils:add-pool:local] FINISH ---`)
})

const confirmCurrentPools = async (instance: Booster) => {
  const _poolLength = await instance.poolLength()
  console.log(`poolLength ... ${_poolLength.toNumber()}`)
  const results = []
  for (let i = 0; i < _poolLength.toNumber(); i++) {
    const poolInfo = await instance.poolInfo(i)
    const { lptoken, token, gauge, kglRewards, stash, shutdown } = poolInfo
    results.push({
      lptoken,
      token,
      gauge,
      kglRewards,
      stash,
      shutdown
    })
  }
  console.log(results)
}

task(
  "test-utils:create-gauge:local",
  'test-utils:create-gauge:local'
).setAction(async ({}, hre: HardhatRuntimeEnvironment) => {
  const { ethers, network: _network } = hre
  if (!(SUPPORTED_NETWORK as ReadonlyArray<string>).includes(_network.name)) throw new Error(`Support only ${SUPPORTED_NETWORK} ...`)
  const networkName = _network.name as SupportedNetwork
  const _deployer = (await ethers.getSigners())[0]

  console.log(`--- [test-utils:create-gauge:local] START ---`)
  console.log(`network name ... ${networkName}`)
  console.log(`deployer ... ${_deployer.address}`)

  const results = []
  for await (const [index, poolName] of POOL_NAMES.entries()) {
    const lpToken = await new MintableERC20__factory(_deployer).deploy(
      `New ${poolName} Token`,
      `SYMBOL${index + 1}_NEW`,
      18
    )
    await lpToken.deployTransaction.wait()
    const gauge = await new MockKaglaGauge__factory(_deployer).deploy(lpToken.address)
    await gauge.deployTransaction.wait()
    results.push({
      gauge: gauge.address,
      lpToken: lpToken.address
    })
  }
  console.log(results)
  console.log(`--- [test-utils:create-gauge:local] FINISH ---`)
})
