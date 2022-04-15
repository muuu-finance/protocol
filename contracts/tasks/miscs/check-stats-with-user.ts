import { task } from "hardhat/config"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { BaseRewardPool, BaseRewardPool__factory, Booster__factory, ERC20, ERC20__factory } from "../../types"
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
  astar: "",
  shiden: "0x762b149eA23070d6F021F70CB8877d2248278855",
  localhost: ""
}

// main
task("check-stats-with-user", "Check Stats with user").setAction(
  async ({}, hre: HardhatRuntimeEnvironment) => {
    const { network: _network, ethers } = hre
    console.log(`------- [check:stats-with-user] START -------`)
    console.log(`network ... ${_network.name}`)

    if (!(SUPPORTED_NETWORK as ReadonlyArray<string>).includes(_network.name)) throw new Error(`Support only ${SUPPORTED_NETWORK} ...`)
    const network = _network.name as SupportedNetwork

    const { system } = TaskUtils.loadDeployedContractAddresses({
      network: network,
    })

    const booster = await Booster__factory.connect(system.booster, ethers.provider)
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

    console.log("--- pools")
    for (const p of poolInfos) {
      console.log(await getStatsInPool(
        EOA,
        BaseRewardPool__factory.connect(p.kglRewards, ethers.provider),
        registry,
        ERC20__factory.connect(p.lptoken, ethers.provider)
      ))
    }

    console.log(`------- [check:stats-with-user] FINISHED -------`)
  }
)

const getStatsInPool = async (eoa: string, rewardPool: BaseRewardPool, registry: Contract, lpToken: ERC20) => {
  const datas = await Promise.all([
    rewardPool.totalSupply().then(v => ethers.utils.formatUnits(v)),
    rewardPool.rewardRate().then(v => ethers.utils.formatUnits(v)),
    rewardPool.earned(eoa).then(v => ethers.utils.formatUnits(v)),
    lpToken.name(),
    lpToken.symbol(),
    (registry.get_virtual_price_from_lp_token(lpToken.address) as Promise<BigNumber>).then(v => ethers.utils.formatUnits(v))
  ])
  return {
    totalSupply: datas[0],
    rewardRate: datas[1],
    earned: datas[2],
    name: datas[3],
    symbol: datas[4],
    virtualPrice: datas[5],
  }
}
