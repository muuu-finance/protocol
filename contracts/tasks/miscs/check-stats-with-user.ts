import { task } from "hardhat/config"
import { HardhatEthersHelpers, HardhatRuntimeEnvironment } from "hardhat/types"
import { BaseRewardPool, BaseRewardPool__factory, Booster, Booster__factory, ERC20, ERC20__factory, MuuuLockerV2, MuuuLockerV2__factory, MuuuToken__factory } from "../../types"
import { TaskUtils } from "../utils"
import jsonfile from 'jsonfile'
import { BigNumber, Contract, ethers } from "ethers"

const ABI_ADDRESS_PROVIDER = jsonfile.readFileSync(`${__dirname}/abis/AddressProvider.json`)
const ABI_REGISTRY = jsonfile.readFileSync(`${__dirname}/abis/Registry.json`)

const SUPPORTED_NETWORK = ["astar", "shiden", "localhost"] as const
type SupportedNetwork = typeof SUPPORTED_NETWORK[number]

// parameters
const EOA = ""
const addressProviderAddress: { [key in SupportedNetwork]: string } = {
  astar: "0x5a0ad8337E5C6895b3893E80c8333859DAcf7c01",
  shiden: "0x762b149eA23070d6F021F70CB8877d2248278855",
  localhost: ""
}

// main
task("check-stats-with-user", "Check Stats with user").setAction(
  async ({}, hre: HardhatRuntimeEnvironment) => {
    const { network: _network, ethers } = hre
    console.log(`------- [check:stats-with-user] START -------`)
    console.log(`network ... ${_network.name}`)
    console.log(`check target ... ${EOA}`)

    if (!(SUPPORTED_NETWORK as ReadonlyArray<string>).includes(_network.name)) throw new Error(`Support only ${SUPPORTED_NETWORK} ...`)
    const network = _network.name as SupportedNetwork

    const { system } = TaskUtils.loadDeployedContractAddresses({
      network: network,
    })

    const booster = Booster__factory.connect(system.booster, ethers.provider)
    const poolCount = await booster.poolLength()
    const poolInfos = await Promise.all([...Array(poolCount.toNumber())].map(
      (_, i) => booster.poolInfo(i)
    ))
    const registryAddress = await (new ethers.Contract(
      addressProviderAddress[network],
      new ethers.utils.Interface(ABI_ADDRESS_PROVIDER),
      ethers.provider
    )).get_registry()
    const registry = new ethers.Contract(
      registryAddress,
      new ethers.utils.Interface(ABI_REGISTRY),
      ethers.provider
    )

    const muuuToken = MuuuToken__factory.connect(system.muuu, ethers.provider)
    const [maxSupply, totalSupply] = await Promise.all([
      muuuToken.maxSupply().then(v => ethers.utils.formatUnits(v)),
      muuuToken.totalSupply().then(v => ethers.utils.formatUnits(v))
    ])
    console.log("--- About MuuuToken")
    console.log(`maxSupply: ${maxSupply}`)
    console.log(`totalSupply: ${totalSupply}`)

    const [kgl, muuu, lockMuuu] = await Promise.all([
      getStatsInKGL(EOA, booster, ethers),
      getStatsInMUUU(EOA, booster, ethers),
      getStatsInLockMUUU(
        EOA,
        MuuuLockerV2__factory.connect(system.muuuLockerV2, ethers.provider),
        system.muKgl,
        ethers
      )
    ])

    console.log("--- KGL")
    console.log(kgl)
    console.log("--- pools")
    for (const p of poolInfos) console.log(await getStatsInPool(
      EOA,
      BaseRewardPool__factory.connect(p.kglRewards, ethers.provider),
      registry,
      ERC20__factory.connect(p.lptoken, ethers.provider)
    ))
    console.log("--- MUUU")
    console.log(muuu)
    console.log("--- Lock MUUU")
    console.log(lockMuuu)

    console.log(`------- [check:stats-with-user] FINISHED -------`)
  }
)

const getStatsInKGL = async (eoa: string, booster: Booster, _ethers: typeof ethers & HardhatEthersHelpers) => {
  const [
    muKglRewardsAddress,
    // feeRewardsAddress
  ] = await Promise.all([
    booster.lockRewards(),
    // booster.lockFees()
  ])
  const muKglRewards = BaseRewardPool__factory.connect(muKglRewardsAddress, _ethers.provider)
  // const feeRewards = BaseRewardPool__factory.connect(feeRewardsAddress, _ethers.provider)
  const datas = await Promise.all([
    muKglRewards.totalSupply().then(v => ethers.utils.formatUnits(v)),
    muKglRewards.rewardRate().then(v => ethers.utils.formatUnits(v)),
    muKglRewards.periodFinish().then(v => new Date(v.toNumber() * 1000)),
    muKglRewards.currentRewards().then(v => ethers.utils.formatUnits(v)),
    muKglRewards.queuedRewards().then(v => ethers.utils.formatUnits(v)),
    eoa ? muKglRewards.earned(eoa).then(v => ethers.utils.formatUnits(v)) : Promise.resolve("-"),
    // feeRewards.rewardRate().then(v => ethers.utils.formatUnits(v)),
    // feeRewards.earned(eoa).then(v => ethers.utils.formatUnits(v)),
  ])
  return {
    muKGL: {
      totalSupply: datas[0],
      rewardRate: datas[1],
      periodFinish: datas[2],
      currentRewards: datas[3],
      queuedRewards: datas[4],
      earned: datas[5],
    },
    // "3KGL": {
    //   rewardRate: datas[3],
    //   earned: datas[4]
    // }
  }
}

const getStatsInPool = async (eoa: string, rewardPool: BaseRewardPool, registry: Contract, lpToken: ERC20) => {
  const datas = await Promise.all([
    rewardPool.totalSupply().then(v => ethers.utils.formatUnits(v)),
    rewardPool.rewardRate().then(v => ethers.utils.formatUnits(v)),
    rewardPool.periodFinish().then(v => new Date(v.toNumber() * 1000)),
    rewardPool.currentRewards().then(v => ethers.utils.formatUnits(v)),
    rewardPool.queuedRewards().then(v => ethers.utils.formatUnits(v)),
    eoa ? rewardPool.earned(eoa).then(v => ethers.utils.formatUnits(v)) : Promise.resolve("-"),
    lpToken.name(),
    lpToken.symbol(),
    (registry.get_virtual_price_from_lp_token(lpToken.address) as Promise<BigNumber>).then(v => ethers.utils.formatUnits(v))
  ])
  return {
    totalSupply: datas[0],
    rewardRate: datas[1],
    periodFinish: datas[2],
    currentRewards: datas[3],
    queuedRewards: datas[4],
    earned: datas[5],
    name: datas[6],
    symbol: datas[7],
    virtualPrice: datas[8],
  }
}

const getStatsInMUUU = async (eoa: string, booster: Booster, _ethers: typeof ethers & HardhatEthersHelpers) => {
  const muuuRewardsAddress = await booster.stakerRewards()
  const muuuRewards = BaseRewardPool__factory.connect(muuuRewardsAddress, _ethers.provider)
  const datas = await Promise.all([
    muuuRewards.totalSupply().then(v => _ethers.utils.formatUnits(v)),
    muuuRewards.rewardRate().then(v => _ethers.utils.formatUnits(v)),
    muuuRewards.periodFinish().then(v => new Date(v.toNumber() * 1000)),
    muuuRewards.currentRewards().then(v => ethers.utils.formatUnits(v)),
    muuuRewards.queuedRewards().then(v => ethers.utils.formatUnits(v)),
    eoa ? muuuRewards.earned(eoa).then(v => ethers.utils.formatUnits(v)) : Promise.resolve("-"),
  ])
  return {
    totalSupply: datas[0],
    rewardRate: datas[1],
    periodFinish: datas[2],
    currentRewards: datas[3],
    queuedRewards: datas[4],
    earned: datas[5]
  }
}

const getStatsInLockMUUU = async (eoa: string, locker: MuuuLockerV2, muKglAddress: string, _ethers: typeof ethers & HardhatEthersHelpers) => {
  const datas = await Promise.all([
    locker.boostedSupply().then(v => _ethers.utils.formatUnits(v)),
    locker.rewardData(muKglAddress),
    eoa ? locker.claimableRewards(eoa).then(v => _ethers.utils.formatUnits(v[0].amount)) : Promise.resolve("-"),
  ])

  return {
    totalSupply: datas[0],
    rewardRate: _ethers.utils.formatUnits(datas[1].rewardRate),
    periodFinish: new Date(datas[1].periodFinish * 1000),
    lastUpdateTime: new Date(datas[1].lastUpdateTime * 1000),
    rewardPerTokenStored: _ethers.utils.formatUnits(datas[1].rewardPerTokenStored),
    earned: datas[2],
  }
}
