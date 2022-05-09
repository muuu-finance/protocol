import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import {
  Booster__factory,
  ERC20__factory,
  IGaugeController__factory,
} from '../../types'
import { loadConstants } from '../constants'
import { TaskUtils } from '../utils'

const SUPPORTED_NETWORK = ['astar', 'shiden', 'localhost'] as const
type SupportedNetwork = typeof SUPPORTED_NETWORK[number]

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

      const lpToken = await ERC20__factory.connect(poolInfo.lptoken, deployer)
      console.log('Lp Name:', await lpToken.symbol())
      console.log('Pool Gauge Address:', poolInfo.gauge)

      const weight = await gaugeController.get_gauge_weight(poolInfo.gauge)
      console.log('Gauge Weight:', weight)

      console.log(`Before Vote`)
      await checkVoteInfo(system.voteProxy, poolInfo.gauge)

      console.log('--- Vote Start ---')
      // memo: cannot vote more than once each gauge
      // await booster.voteGaugeWeight([poolInfo.gauge], [weights[i]])
      console.log('--- Vote Finish ---')

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
