const { time } = require('@openzeppelin/test-helpers')
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants')

const Booster = artifacts.require('Booster')
const KaglaVoterProxy = artifacts.require('KaglaVoterProxy')
const BaseRewardPool = artifacts.require('BaseRewardPool')
const MuuuToken = artifacts.require('MuuuToken')
const MuKglToken = artifacts.require('MuKglToken')
const StashFactory = artifacts.require('StashFactory')
const RewardFactory = artifacts.require('RewardFactory')
const TokenFactory = artifacts.require('TokenFactory')
const PoolManager = artifacts.require('PoolManager')

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
      await MockRegistry.new(ZERO_ADDRESS, ZERO_ADDRESS, threeKglToken.address)
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

  const rewardFactory = await RewardFactory.new(
    booster.address,
    kglToken.address,
  )
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

  const threeKglGauge = '0xbFcF63294aD7105dEa65aA58F8AE5BE2D9d0952A' // dummy
  const threeKglSwap = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7' // dummy
  await poolManager.addPool(
    // TODO: remove Kagla address, use test or mock address
    threeKglSwap /** 3Pool address */,
    threeKglGauge /** 3Pool Gauge address */,
    0,
  )

  return {
    threeKglToken,
    booster,
    baseRewardPool,
  }
}

contract('Shutdown Test', async (accounts) => {
  it('should deposit, shutdown, withdraw, upgrade, redeposit', async () => {
    const {
      threeKglToken: threeKgl,
      booster,
      baseRewardPool: rewardPool,
    } = await setupContracts()
    const [admin, userA] = accounts

    let starttime = await time.latest()
    console.log('current block time: ' + starttime)
    await time.latestBlock().then((a) => console.log('current block: ' + a))

    await threeKgl.mint(50000, { from: userA })
    let startingThreeKgl = await threeKgl.balanceOf(userA)
    console.log('3kgl: ' + startingThreeKgl)

    //deposit, funds move to gauge
    await threeKgl.approve(booster.address, 0, { from: userA })
    await threeKgl.approve(booster.address, startingThreeKgl, { from: userA })
    const poolId = 0
    // TODO: revert (Consider in GaugeMock)
    await booster.deposit(poolId, 10000, true, { from: userA })

    console.log(`3kgl on wallet: ${await threeKgl.balanceOf(userA)}`)
    console.log(`deposited lp: ${await rewardPool.balanceOf(userA)}`)
    console.log(`3kgl at booster: ${await threeKgl.balanceOf(booster.address)}`)
    // TODO: revert or remove (Consider in GaugeMock)
    // await voteproxy
    //   .balanceOfPool(threeKglGauge)
    //   .then((a) => console.log('3kgl on gauge ' + a))

    //shutdown, funds move back to booster(depositor)
    await booster.shutdownSystem({ from: admin })
    console.log('system shutdown')
    console.log(`3kgl on wallet: ${await threeKgl.balanceOf(userA)}`)
    console.log(`deposited lp: ${await rewardPool.balanceOf(userA)}`)
    console.log(`3kgl at booster: ${await threeKgl.balanceOf(booster.address)}`)
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
    console.log(`3kgl on wallet: ${await threeKgl.balanceOf(userA)}`)
    console.log(`deposited lp: ${await rewardPool.balanceOf(userA)}`)
    console.log(`3kgl at booster: ${await threeKgl.balanceOf(booster.address)}`)
    // TODO: revert or remove (Consider in GaugeMock)
    // await voteproxy
    //   .balanceOfPool(threeKglGauge)
    //   .then((a) => console.log('3kgl on gauge ' + a))

    // TODO:
    //  relaunch the system and connect to voteproxy and muuu contracts
  })
})
