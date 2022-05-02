import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Booster, Booster__factory, PoolManagerV3__factory } from "../../types";
import { TaskUtils } from "../utils";

const SUPPORTED_NETWORK = ["astar", "shiden", "localhost"] as const
type SupportedNetwork = typeof SUPPORTED_NETWORK[number]
type EthereumAddress = `0x${string}`

type Constant = {
  removingPools: { poolIndex: number, gauge: EthereumAddress }[]
  addingPools: EthereumAddress[] // gauge addresses to set new pool
}

const astarConstant: Constant = {
  removingPools: [
    { poolIndex: 0, gauge: "0xa480B71b5aFBe28df9658C253e1E18A5EeDA131E" },
    { poolIndex: 1, gauge: "0x13EE6d778B41229a8dF6a2c6EB2dcf595faFc2f4" },
    { poolIndex: 2, gauge: "0x940f388bb2f33C81840b70cDd72b3bC73d76232E" }
  ],
  addingPools: [
    "0x35327a731cCc30C043e74E2c7385486Ef905Eb08",
    "0x6b822dE272355524D92Ab70310035e4c573044bE",
    "0x5A2497F1C79C7a9a28224A0dBfc8e6f4EA412074",
  ]
}
const shidenConstant: Constant = {
  removingPools: [
    { poolIndex: 0, gauge: "0xe806e841ca26fF5A82E58A7A9144B7032623E4FB" },
    { poolIndex: 1, gauge: "0xc020e5D53Af59b0Fd22970f9851AcB1a12A317c6" },
    { poolIndex: 2, gauge: "0x02871ff0b539E04A952e1d6cB4ae2f6eBCE7f3eD" }
  ],
  addingPools: [
    "0x6A892edcFfafe4F64896419b1b57965e8e5bb68e",
    "0x1571943e281f8C579Fcf63cBD31E425c0bFDdc74",
    "0xdF180f31739284a1A8Ba3a110cDdaD58642F3DAF"
  ]
}
const localhostConstant: Constant = {
  removingPools: [
    { poolIndex: 1, gauge: "0x8565Fb7dfB5D36b2aA00086ffc920cfF20db4F2f" },
    { poolIndex: 2, gauge: "0xBbC60A8fAf66552554e460d55Ac0563Fb9e76c01" },
    { poolIndex: 3, gauge: "0x0D8448C0fBB84c30395838C8b3fD64722ea94532" },
    { poolIndex: 4, gauge: "0x26d1E94963C8b382Ad66320826399E4B30347404" },
  ],
  addingPools: [
    "0x78dC73Dab92F57DA506F3538A68A2f163dB8c3A0",
    "0xF1479810f495a5E1dc5Fe7bC567Ad2b69D4A8052",
    "0x63870142f7D3030a5966bC031F0ae113F1CEB406",
    "0x2F0fA68F3fD995522E5aB49131c36fc52B6353B2"
  ]
}

const CONSTANTS: { [key in SupportedNetwork]: Constant } = {
  astar: astarConstant,
  shiden: shidenConstant,
  localhost: localhostConstant,
}

task(
  "reset-pools-220427",
  'reset-pools-220427'
).addOptionalParam(
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

  // load constants
  const { removingPools: REMOVING_POOLS, addingPools: ADDING_GAUGES } = CONSTANTS[networkName]
  
  // validations
  console.log(`--- START validations`)
  if (REMOVING_POOLS.length !== ADDING_GAUGES.length) throw new Error("Not match length - adding gauges, removing gauges")
  for (const removingPool of REMOVING_POOLS) {
    const addedPool = await _booster.poolInfo(removingPool.poolIndex)
    if (addedPool.shutdown) throw new Error(`Already shutdown: ${addedPool.toString()}`)
    if (addedPool.gauge.toLowerCase() !== removingPool.gauge.toLowerCase()) throw new Error(`Not match gauge address from Booster#poolInfo: ${removingPool}`)
    if (ADDING_GAUGES.some(addingGauge => addingGauge.toLowerCase() === addedPool.gauge.toLowerCase())) throw new Error(`Include adding gauge address in current pools: ${addedPool}`)
  }
  console.log(`--- FINISH validations`)

  // shotdown
  console.log(`--- START shotdown`)
  for await (const removingPool of REMOVING_POOLS) {
    const tx = await _poolManagerV3.shutdownPool(removingPool.poolIndex)
    await tx.wait()
    console.log(`> shotdown: ${removingPool.poolIndex} ${removingPool.gauge}`)
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
  console.log(`--- confirmation current pools`)
  await confirmCurrentPools(_booster)
  console.log(`--- [reset-pools-220427] FINISHED ---`)
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
  "confirm-pools-220427",
  'confirm-pools-220427'
).setAction(async ({}, hre: HardhatRuntimeEnvironment) => {
  const { ethers, network } = hre
  const { system } = TaskUtils.loadDeployedContractAddresses({ network: network.name })
  const _deployer = (await ethers.getSigners())[0]
  const _booster = Booster__factory.connect(system.booster, _deployer)
  await confirmCurrentPools(_booster)
})