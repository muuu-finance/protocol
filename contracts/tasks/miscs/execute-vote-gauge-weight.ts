import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import {
  Booster,
  Booster__factory,
  ERC20__factory,
  IGaugeController,
  IGaugeController__factory,
} from '../../types'
import { loadConstants } from '../constants'
import { TaskUtils } from '../utils'

const SUPPORTED_NETWORK = ['astar', 'shiden', 'localhost'] as const
const BASE_VOTE_WEIGHT: { [key in number]: number } = {
  3: 100, // 3Pool
  4: 100, // Starlay 3Pool
  5: 100, // BUSD+3KGL
  6: 9050, // bai3kgl
  7: 100, // oUSD3kgl
  8: 100, // aUSD3kgl
  9: 186, // ASTR/nASTR
  10: 264, // KGL/muKGL
}

const generateVoteWeightParameter = async (
  voterProxyAddress: string,
  booster: Booster,
  gaugeController: IGaugeController,
) => {
  const total = Object.values(BASE_VOTE_WEIGHT).reduce(
    (pre, cur) => pre + cur,
    0,
  )
  if (total !== 10000)
    throw Error(`total of BASE_VOTE_WEIGHT is not 10000(=100%): now ${total}`)

  // Collect pool / gauge / gauge weight infos
  const infos: {
    pid: number
    gauge: string
    currentWeight: number
    futureWeight: number
    diff: number
  }[] = []
  for (const pid of Object.keys(BASE_VOTE_WEIGHT)) {
    const poolInfo = await booster.poolInfo(pid)
    if (poolInfo.shutdown)
      throw new Error(`Include shutdown pool: pid = ${pid}`)
    const voteUserSlopes = await gaugeController.vote_user_slopes(
      voterProxyAddress,
      poolInfo.gauge,
    )
    const futureWeight = BASE_VOTE_WEIGHT[Number(pid)]
    const currentPower = voteUserSlopes[1].toNumber()
    infos.push({
      pid: Number(pid),
      gauge: poolInfo.gauge,
      currentWeight: currentPower,
      futureWeight: futureWeight,
      diff: currentPower - futureWeight,
    })
  }

  // sort in descending order of minus
  infos.sort((a, b) => b.diff - a.diff)
  return {
    gauges: infos.map((v) => v.gauge),
    weights: infos.map((v) => v.futureWeight),
  }
}

task('execute-vote-gauge-weight', 'Execute voteGaugeWeight').setAction(
  async ({}, hre: HardhatRuntimeEnvironment) => {
    const { network, ethers } = hre

    if (!(SUPPORTED_NETWORK as ReadonlyArray<string>).includes(network.name))
      throw new Error(`Support only ${SUPPORTED_NETWORK} ...`)

    console.log(`------- START -------`)
    console.log(`network ... ${network.name}`)
    const { system } = TaskUtils.loadDeployedContractAddresses({
      network: network.name,
    })
    const constants = loadConstants({
      network: network.name,
      isUseMocks: false,
    })
    const deployer = (await ethers.getSigners())[0]

    const booster = await Booster__factory.connect(system.booster, deployer)
    const gaugeController = await IGaugeController__factory.connect(
      constants.kaglas.gaugeController,
      deployer,
    )

    const veKgl = await ERC20__factory.connect(
      constants.kaglas.votingEscrow,
      deployer,
    )
    const balance = await veKgl.balanceOf(system.voteProxy)
    console.log('VoterProxy holds veKGL:', balance.toString())

    const kgl = await ERC20__factory.connect(constants.tokens.KGL, deployer)
    const kglBalance = await kgl.balanceOf(system.voteProxy)
    console.log('VoterProxy holds KGL:', kglBalance.toString())

    const poolCount = await booster.poolLength()

    // TMP: should read weights from another file or something
    // weight: 100% = 10000
    // const weights = [5000, 2000, 3000]

    const checkVoteInfo = async (user: string, gauge: string) => {
      const voteInfoBefore = await gaugeController.vote_user_slopes(user, gauge)
      console.log('slope:', voteInfoBefore[0].toString())
      console.log('power:', voteInfoBefore[1].toString())
      console.log('end:', voteInfoBefore[2].toString())
    }

    for (let i = 0; i < poolCount.toNumber(); i++) {
      const poolInfo = await booster.poolInfo(i)
      if (poolInfo.shutdown) {
        continue
      }

      const lpToken = await ERC20__factory.connect(poolInfo.lptoken, deployer)
      console.log('Lp Name:', await lpToken.symbol())
      console.log('Pool Gauge Address:', poolInfo.gauge)

      const weight = await gaugeController.get_gauge_weight(poolInfo.gauge)
      console.log('Gauge Weight:', weight.toString())

      console.log(`Before Vote`)
      await checkVoteInfo(system.voteProxy, poolInfo.gauge)
    }

    console.log('--- Vote Start ---')
    // memo: cannot vote more than once each gauge
    const { gauges, weights } = await generateVoteWeightParameter(
      system.voteProxy,
      booster,
      gaugeController,
    )
    console.log('gauges', gauges)
    console.log('weights', weights)
    const tx = await booster.voteGaugeWeight(gauges, weights)
    await tx.wait()
    console.log('--- Vote Finish ---')

    for (let i = 0; i < poolCount.toNumber(); i++) {
      const poolInfo = await booster.poolInfo(i)
      if (poolInfo.shutdown) {
        continue
      }

      const lpToken = await ERC20__factory.connect(poolInfo.lptoken, deployer)
      console.log('Lp Name:', await lpToken.symbol())
      console.log('Pool Gauge Address:', poolInfo.gauge)

      const weight = await gaugeController.get_gauge_weight(poolInfo.gauge)
      console.log('Gauge Weight:', weight.toString())

      console.log(`After Vote`)
      await checkVoteInfo(system.voteProxy, poolInfo.gauge)
    }
    console.log(`--- FINISHED ---`)
  },
)

task('confirm-vote-gauge-weight', 'Confirm voteGaugeWeight').setAction(
  async ({}, hre: HardhatRuntimeEnvironment) => {
    const { network, ethers } = hre

    if (!(SUPPORTED_NETWORK as ReadonlyArray<string>).includes(network.name))
      throw new Error(`Support only ${SUPPORTED_NETWORK} ...`)

    console.log(`------- START -------`)
    console.log(`network ... ${network.name}`)
    const {
      system: { booster, voteProxy },
    } = TaskUtils.loadDeployedContractAddresses({
      network: network.name,
    })
    const constants = loadConstants({
      network: network.name,
      isUseMocks: false,
    })

    const _booster = await Booster__factory.connect(booster, ethers.provider)
    const gaugeController = await IGaugeController__factory.connect(
      constants.kaglas.gaugeController,
      ethers.provider,
    )

    const poolCount = await _booster.poolLength()
    for (let i = 0; i < poolCount.toNumber(); i++) {
      const poolInfo = await _booster.poolInfo(i)
      if (poolInfo.shutdown) {
        console.log(`skip to confirm pool ${i} because shotdown`)
        continue
      }
      console.log(`> pid: ${i}, gauge: ${poolInfo.gauge}`)
      const weight = await gaugeController.get_gauge_weight(poolInfo.gauge)
      console.log('Gauge Weight:', weight.toString())
      const voteUserSlopes = await gaugeController.vote_user_slopes(
        voteProxy,
        poolInfo.gauge,
      )
      // ref: https://github.com/kagla-finance/kagla-dao-contracts/blob/main/contracts/GaugeController.vy#L18-L21
      console.log('slope:', voteUserSlopes[0].toString())
      console.log('power:', voteUserSlopes[1].toString())
      console.log('end:', new Date(voteUserSlopes[2].toNumber() * 1000))
    }

    console.log(`--- FINISHED ---`)
  },
)

task('check-vote-weight-parameter', 'Check voteWeight parameter').setAction(
  async ({}, hre: HardhatRuntimeEnvironment) => {
    const { network, ethers } = hre
    const { system } = TaskUtils.loadDeployedContractAddresses({
      network: network.name,
    })
    const constants = loadConstants({
      network: network.name,
      isUseMocks: false,
    })
    const booster = await Booster__factory.connect(
      system.booster,
      ethers.provider,
    )
    const gaugeController = await IGaugeController__factory.connect(
      constants.kaglas.gaugeController,
      ethers.provider,
    )
    const { gauges, weights } = await generateVoteWeightParameter(
      system.voteProxy,
      booster,
      gaugeController,
    )
    console.log(`> gauges`)
    console.log(gauges)
    console.log(`> weights`)
    console.log(weights)
  },
)
