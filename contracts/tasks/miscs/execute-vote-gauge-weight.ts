import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import {
  Booster__factory,
  ERC20__factory,
  IGaugeController__factory,
} from '../../types'
import { loadConstants } from '../constants'
import { TaskUtils } from '../utils'

task(
  'execute-vote-gauge-weight',
  'Execute voteGaugeWeight',
).setAction(async ({}, hre: HardhatRuntimeEnvironment) => {
  const { network, ethers } = hre
  if (
    !(
      network.name === 'astar' ||
      network.name === 'shiden' ||
      network.name === 'localhost'
    )
  )
    throw new Error('Support only astar, shiden...')
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

  for (let i = 0; i < poolCount.toNumber(); i++) {
    const poolInfo = await booster.poolInfo(i)

    const lpToken = await ERC20__factory.connect(poolInfo.lptoken, deployer)
    console.log('Lp Name:', await lpToken.symbol())
    console.log('Pool Gauge Address:', poolInfo.gauge)

    const weight = await gaugeController.get_gauge_weight(poolInfo.gauge)
    console.log('Gauge Weight:', weight)

    const voteInfoBefore = await gaugeController.vote_user_slopes(
      system.voteProxy,
      poolInfo.gauge,
    )
    console.log('Vote Info Before slope:', voteInfoBefore[0].toString())
    console.log('Vote Info Before power:', voteInfoBefore[1].toString())
    console.log('Vote Info Before end of lock:', voteInfoBefore[2].toString())

    console.log('--- Vote Start ---')
    // memo: cannot vote more than once each gauge
    // await booster.voteGaugeWeight([poolInfo.gauge], [weights[i]])
    console.log('--- Vote Finish ---')

    const voteInfoAfter = await gaugeController.vote_user_slopes(
      system.voteProxy,
      poolInfo.gauge,
    )
    console.log('Vote Info After slope:', voteInfoAfter[0].toString())
    console.log('Vote Info After power:', voteInfoAfter[1].toString())
    console.log('Vote Info After end of lock:', voteInfoAfter[2].toString())
  }
  console.log(`--- FINISHED ---`)
})
