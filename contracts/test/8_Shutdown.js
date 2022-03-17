const { time } = require('@openzeppelin/test-helpers')
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants')
var jsonfile = require('jsonfile')
var contractList = jsonfile.readFileSync('./contracts.json')

const Booster = artifacts.require('Booster')
const KglDepositor = artifacts.require('KglDepositor')
const KaglaVoterProxy = artifacts.require('KaglaVoterProxy')
const BaseRewardPool = artifacts.require('BaseRewardPool')
const muuuRewardPool = artifacts.require('muuuRewardPool')
const MuuuToken = artifacts.require('MuuuToken')
const MuKglToken = artifacts.require('muKglToken')
const StashFactory = artifacts.require('StashFactory')
const RewardFactory = artifacts.require('RewardFactory')
const TokenFactory = artifacts.require('TokenFactory')
const PoolManager = artifacts.require('PoolManager')

const IExchange = artifacts.require('IExchange')
const IKaglaFi = artifacts.require('I3KaglaFi')
const IERC20 = artifacts.require('IERC20')

const MockVotingEscrow = artifacts.require('MockKaglaVoteEscrow')
const MockRegistry = artifacts.require('MockKaglaRegistry')
const MockFeeDistributor = artifacts.require('MockKaglaFeeDistributor')
const MockAddressProvider = artifacts.require('MockKaglaAddressProvider')
const MockMintableERC20 = artifacts.require('MintableERC20')

const setupContracts = async () => {
  const votingEscrow = await MockVotingEscrow.new()
  const kglToken = await MockMintableERC20.new('Kagle Token', 'KGL', 18)
  const muKglToken = await MuKglToken.new()
  const kaglaVoterProxy = await KaglaVoterProxy.new(
    kglToken.address,
    votingEscrow.address,
    ZERO_ADDRESS,
    ZERO_ADDRESS,
  )
  const muuuToken = await MuuuToken.new(kaglaVoterProxy.address)

  const threeKglToken = await MockMintableERC20.new(
    'Kagle USDC/USDT/DAI',
    '3Kgl',
    18,
  )

  const addressProvider = await MockAddressProvider.new(
    (
      await MockRegistry.new(threeKglToken.address)
    ).address,
    (
      await MockFeeDistributor.new(threeKglToken.address)
    ).address,
  )

  const booster = await Booster.new(
    kaglaVoterProxy.address,
    muuuToken.address,
    kglToken.address,
    addressProvider.address,
  )
  await kaglaVoterProxy.setOperator(booster.address)

  const rewardFactory = await RewardFactory.new(booster.address)
  await booster.setFactories(
    rewardFactory.address,
    (
      await StashFactory.new(booster.address, rewardFactory.address)
    ).address,
    (
      await TokenFactory.new(booster.address)
    ).address,
  )

  const baseRewardPool = await BaseRewardPool.new(
    0,
    muKglToken.address,
    kglToken.address,
    booster.address,
    rewardFactory.address,
  )

  const poolManager = await PoolManager.new(
    booster.address,
    addressProvider.address,
  )
  await booster.setPoolManager(poolManager.address)
  await poolManager.addPool(
    // TODO: remove Kagla address, use test or mock address
    '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7' /** 3Pool address */,
    '0xbFcF63294aD7105dEa65aA58F8AE5BE2D9d0952A' /** 3Pool Gauge address */,
    0,
  )

  return {
    kglToken,
    muuuToken,
    threeKglToken,
    kaglaVoterProxy,
    booster,
    baseRewardPool,
  }
}

contract('Shutdown Test', async (accounts) => {
  it('should deposit, shutdown, withdraw, upgrade, redeposit', async () => {
    let threeKglGauge = '0xbFcF63294aD7105dEa65aA58F8AE5BE2D9d0952A'
    let threeKglSwap = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7'

    //system
    // let muKgl = await muKglToken.deployed()
    // let kglDeposit = await KglDepositor.deployed()

    // var poolId = contractList.pools.find((pool) => pool.name == '3pool').id
    // var poolinfo = await booster.poolInfo(poolId)
    // var rewardPoolAddress = poolinfo.kglRewards
    // var rewardPool = await BaseRewardPool.at(rewardPoolAddress)

    const {
      kglToken: kgl,
      muuuToken: muuu,
      threeKglToken: threeKgl,
      kaglaVoterProxy: voteproxy,
      booster,
      baseRewardPool: rewardPool,
    } = await setupContracts()
    const [admin, userA, , caller] = accounts

    let starttime = await time.latest()
    console.log('current block time: ' + starttime)
    await time.latestBlock().then((a) => console.log('current block: ' + a))

    //get 3kgl
    // await weth.sendTransaction({
    //   value: web3.utils.toWei('2.0', 'ether'),
    //   from: userA,
    // })
    // let startingWeth = await weth.balanceOf(userA)
    // await weth.approve(exchange.address, startingWeth, { from: userA })
    // await exchange.swapExactTokensForTokens(
    //   startingWeth,
    //   0,
    //   [weth.address, dai.address],
    //   userA,
    //   starttime + 3000,
    //   { from: userA },
    // )
    // let startingDai = await dai.balanceOf(userA)
    // await dai.approve(threekglswap.address, startingDai, { from: userA })
    // await threekglswap.add_liquidity([startingDai, 0, 0], 0, { from: userA })

    await threeKgl.mint(50000, { from: userA })
    let startingThreeKgl = await threeKgl.balanceOf(userA)
    console.log('3kgl: ' + startingThreeKgl)

    //deposit, funds move to gauge
    await threeKgl.approve(booster.address, 0, { from: userA })
    await threeKgl.approve(booster.address, startingThreeKgl, { from: userA })
    const poolId = 0
    // TODO: revert (Consider in GaugeMock)
    await booster.deposit(poolId, 10000, true, { from: userA })

    await threeKgl
      .balanceOf(userA)
      .then((a) => console.log('3kgl on wallet: ' + a))
    await rewardPool
      .balanceOf(userA)
      .then((a) => console.log('deposited lp: ' + a))
    await threeKgl
      .balanceOf(booster.address)
      .then((a) => console.log('3kgl at booster ' + a))
    // TODO: revert or remove (Consider in GaugeMock)
    // await voteproxy
    //   .balanceOfPool(threeKglGauge)
    //   .then((a) => console.log('3kgl on gauge ' + a))

    //shutdown, funds move back to booster(depositor)
    await booster.shutdownSystem({ from: admin })
    console.log('system shutdown')
    await threeKgl
      .balanceOf(userA)
      .then((a) => console.log('3kgl on wallet: ' + a))
    await rewardPool
      .balanceOf(userA)
      .then((a) => console.log('deposited lp: ' + a))
    await threeKgl
      .balanceOf(booster.address)
      .then((a) => console.log('3kgl at booster ' + a))
    // TODO: revert or remove (Consider in GaugeMock)
    // await voteproxy
    //   .balanceOfPool(threeKglGauge)
    //   .then((a) => console.log('3kgl on gauge ' + a))

    //try to deposit while in shutdown state, will revert
    console.log('try deposit again')
    await booster
      .deposit(poolId, 10000, true, { from: userA })
      .catch((a) => console.log('--> deposit reverted'))

    //withdraw lp tokens from old booster
    console.log('withdraw')
    await booster.withdrawAll(poolId, { from: userA })
    await threeKgl
      .balanceOf(userA)
      .then((a) => console.log('3kgl on wallet: ' + a))
    await rewardPool
      .balanceOf(userA)
      .then((a) => console.log('deposited lp: ' + a))
    await threeKgl
      .balanceOf(booster.address)
      .then((a) => console.log('3kgl at booster ' + a))
    // TODO: revert or remove (Consider in GaugeMock)
    // await voteproxy
    //   .balanceOfPool(threeKglGauge)
    //   .then((a) => console.log('3kgl on gauge ' + a))

    //relaunch the system and connect to voteproxy and muuu contracts

    //first booster and set as operator on vote proxy
    console.log('create new booster and factories')
    let booster2 = await Booster.new(voteproxy.address, muuu.address, 0)
    await voteproxy.setOperator(booster2.address)
    console.log('set new booster as voteproxy operator')

    //create factories
    let rewardFactory2 = await RewardFactory.new(booster2.address)
    let stashFactory2 = await StashFactory.new(
      booster2.address,
      rewardFactory2.address,
    )
    let tokenFactory2 = await TokenFactory.new(booster2.address)
    await booster2.setFactories(
      rewardFactory2.address,
      stashFactory2.address,
      tokenFactory2.address,
    )
    console.log('factories set')

    //tell muuu to update its operator(mint role)
    await muuu.updateOperator()
    console.log('muuu operater updated')

    //create new reward pools for staking muKgl and muuu
    let muKglRewardsContract2 = await BaseRewardPool.new(
      0,
      muKgl.address,
      kgl.address,
      booster2.address,
      rewardFactory2.address,
    )
    console.log('create new muKgl reward pool')
    let muuuRewardsContract2 = await muuuRewardPool.new(
      muuu.address,
      kgl.address,
      kglDeposit.address,
      muKglRewardsContract2.address,
      muKgl.address,
      booster2.address,
      admin,
    )
    console.log('create new muuu reward pool')
    await booster2.setRewardContracts(
      muKglRewardsContract2.address,
      muuuRewardsContract2.address,
    )
    console.log('set stake reward contracts')

    //set vekgl info
    await booster2.setFeeInfo()
    console.log('vekgl fee info set')

    let poolManager2 = await PoolManager.new(booster2.address)
    await booster2.setPoolManager(poolManager2.address)

    //add 3kgl pool
    await poolManager2.addPool(threeKglSwap, threeKglGauge, 0)
    console.log('3kgl pool added')

    poolinfo = await booster2.poolInfo(0)
    rewardPoolAddress = poolinfo.kglRewards
    rewardPool = await BaseRewardPool.at(rewardPoolAddress)
    console.log('pool lp token ' + poolinfo.lptoken)
    console.log('pool gauge ' + poolinfo.gauge)
    console.log('pool reward contract at ' + rewardPool.address)

    //deposit to new booster, tokens move to gauge
    let threeKglbalance = await threeKgl.balanceOf(userA)
    await threeKgl.approve(booster2.address, 0, { from: userA })
    await threeKgl.approve(booster2.address, threeKglbalance, { from: userA })
    await booster2.depositAll(0, true, { from: userA })
    await threeKgl
      .balanceOf(userA)
      .then((a) => console.log('3kgl on wallet: ' + a))
    await rewardPool
      .balanceOf(userA)
      .then((a) => console.log('deposited lp: ' + a))
    await threeKgl
      .balanceOf(booster2.address)
      .then((a) => console.log('3kgl at booster2 ' + a))
    await voteproxy
      .balanceOfPool(threeKglGauge)
      .then((a) => console.log('3kgl on gauge ' + a))

    //increase time
    await time.increase(15 * 86400)
    await time.advanceBlock()
    console.log('advance time...')

    await time.latest().then((a) => console.log('current block time: ' + a))
    await time.latestBlock().then((a) => console.log('current block: ' + a))

    //distribute rewards
    await booster2.earmarkRewards(0, { from: caller })
    console.log('rewards earmarked')

    //3kgl reward pool for kgl
    await rewardPool
      .balanceOf(userA)
      .then((a) => console.log('reward balance: ' + a))
    await rewardPool
      .earned(userA)
      .then((a) => console.log('rewards earned(unclaimed): ' + a))

    //increase time
    await time.increase(4 * 86400)
    await time.advanceBlock()

    //check earned balances again
    await rewardPool
      .balanceOf(userA)
      .then((a) => console.log('reward balance: ' + a))
    await rewardPool
      .earned(userA)
      .then((a) => console.log('rewards earned(unclaimed): ' + a))
    await kgl.balanceOf(userA).then((a) => console.log('userA kgl: ' + a))
    await muuu.balanceOf(userA).then((a) => console.log('userA muuu: ' + a))

    //claim rewards
    await rewardPool.getReward({ from: userA })
    console.log('getReward()')
    await kgl.balanceOf(userA).then((a) => console.log('userA kgl: ' + a))
    await muuu.balanceOf(userA).then((a) => console.log('userA muuu: ' + a))
    await kgl
      .balanceOf(rewardPool.address)
      .then((a) => console.log('rewards left: ' + a))
  })
})
