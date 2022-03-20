const {
  BN,
  constants,
  expectEvent,
  expectRevert,
  time,
} = require('@openzeppelin/test-helpers')

const KaglaVoterProxy = artifacts.require('KaglaVoterProxy')
const Booster = artifacts.require('Booster')
const RewardFactory = artifacts.require('RewardFactory')
const TokenFactory = artifacts.require('TokenFactory')
const StashFactory = artifacts.require('StashFactory')
const MuuuToken = artifacts.require('MuuuToken')
const BaseRewardPool = artifacts.require('BaseRewardPool')
const PoolManager = artifacts.require('PoolManager')
const IERC20 = artifacts.require('IERC20')

const I3KaglaFi = artifacts.require('I3KaglaFi')

const MintableERC20 = artifacts.require('MintableERC20')
const MockRegistry = artifacts.require('MockKaglaRegistry')
const MockFeeDistributor = artifacts.require('MockKaglaFeeDistributor')
const MockVotingEscrow = artifacts.require('MockKaglaVoteEscrow')
const MockAddressProvider = artifacts.require('MockKaglaAddressProvider')
const MockKaglaGauge = artifacts.require('MockKaglaGauge')
const MockMinter = artifacts.require('MockMinter')
const MockGaugeController = artifacts.require('MockGaugeController')

const KglDepositor = artifacts.require('KglDepositor')

const ExtraRewardStashV2 = artifacts.require('ExtraRewardStashV2')
const VirtualBalanceRewardPool = artifacts.require('VirtualBalanceRewardPool')
//const muKglRewardPool = artifacts.require("muKglRewardPool");
const MuuuRewardPool = artifacts.require('MuuuRewardPool')
const MuKglToken = artifacts.require('MuKglToken')
const DepositToken = artifacts.require('DepositToken')

const IExchange = artifacts.require('IExchange')
const IKaglaFi = artifacts.require('I3KaglaFi')
const ERC20 = artifacts.require('ERC20')

const setupContracts = async (accounts) => {
  const kgl = await MintableERC20.new('kgl', 'KGL', 18)
  const threeKglToken = await MintableERC20.new('3KGL Token', '3Kgl', 18)
  const mockVotingEscrow = await MockVotingEscrow.new()
  const muKglToken = await MuKglToken.new()

  const mockKaglaGauge = await MockKaglaGauge.new(threeKglToken.address)

  const threeKglGaugeAddress = mockKaglaGauge.address
  const mockRegistry = await MockRegistry.new(
    threeKglToken.address, // tmp
    mockKaglaGauge.address,
    threeKglToken.address,
  )

  const mockFeeDistributor = await MockFeeDistributor.new(threeKglToken.address)
  const mockAddressProvider = await MockAddressProvider.new(
    mockRegistry.address,
    mockFeeDistributor.address,
  )

  const mockMinter = await MockMinter.new(kgl.address)
  const mockGaugeController = await MockGaugeController.new()

  const voterProxy = await KaglaVoterProxy.new(
    kgl.address,
    mockVotingEscrow.address,
    mockGaugeController.address,
    mockMinter.address,
  )
  const muuu = await MuuuToken.new(voterProxy.address)
  const booster = await Booster.new(
    voterProxy.address,
    muuu.address,
    kgl.address,
    mockAddressProvider.address,
  )
  await voterProxy.setOperator(booster.address)

  const rewardFactory = await RewardFactory.new(booster.address, kgl.address)
  const tokenFactory = await TokenFactory.new(booster.address)
  const stashFactory = await StashFactory.new(
    booster.address,
    rewardFactory.address,
  )

  const kglDepositor = await KglDepositor.new(
    voterProxy.address,
    muKglToken.address,
    kgl.address,
    mockVotingEscrow.address,
  )
  await muKglToken.setOperator(kglDepositor.address)
  await voterProxy.setDepositor(kglDepositor.address)
  await kglDepositor.initialLock()
  await booster.setTreasury(kglDepositor.address)

  const muKglRewardsContract = await BaseRewardPool.new(
    0,
    muKglToken.address,
    kgl.address,
    booster.address,
    rewardFactory.address,
  )
  const muuuRewardsContract = await MuuuRewardPool.new(
    muuu.address,
    kgl.address,
    kglDepositor.address,
    muKglRewardsContract.address,
    muKglToken.address,
    booster.address,
    accounts[0],
  )
  await booster.setRewardContracts(
    muKglRewardsContract.address,
    muuuRewardsContract.address,
  )

  const poolManager = await PoolManager.new(
    booster.address,
    mockAddressProvider.address,
  )
  await booster.setPoolManager(poolManager.address)

  await booster.setFactories(
    rewardFactory.address,
    stashFactory.address,
    tokenFactory.address,
  )

  await booster.setFeeInfo()

  await poolManager.addPool(threeKglToken.address, threeKglGaugeAddress, 0)
  const poolId = 0
  const poolinfo = await booster.poolInfo(poolId)
  const kglRewardPoolAddress = poolinfo.kglRewards
  const kglRewardPool = await BaseRewardPool.at(kglRewardPoolAddress)
  const depositToken = await IERC20.at(poolinfo.token)
  console.log('pool lp token ' + poolinfo.lptoken)
  console.log('pool gauge ' + poolinfo.gauge)
  console.log('pool kgl reward contract at ' + kglRewardPool.address)
  const depositTokenOperator = await DepositToken.at(poolinfo.token)
  console.log('depositTokenOperator ' + depositTokenOperator.address)

  console.log('Setup completed successfully!')

  return {
    threeKglToken,
    threeKglGaugeAddress,
    booster,
    depositToken,
    kglRewardPool,
    voterProxy,
    poolId,
    muuu,
    muuuRewardsContract,
    kgl,
    muKglRewardsContract,
    muKglToken,
    mockMinter,
  }
}

contract('RewardsTest', async (accounts) => {
  it('should deposit and receive kgl and muuu rewards', async () => {
    let admin = accounts[0]
    let userA = accounts[1]
    let userB = accounts[2]
    let caller = accounts[3]

    const {
      threeKglToken,
      threeKglGaugeAddress,
      booster,
      depositToken,
      kglRewardPool,
      voterProxy,
      poolId,
      muuu,
      muuuRewardsContract,
      kgl,
      muKglRewardsContract,
      muKglToken,
      mockMinter,
    } = await setupContracts(accounts)

    //increase time so that muuu rewards start
    await time.increase(10 * 86400)
    await time.advanceBlock()
    console.log('advance time...')

    const starttime = await time.latest()
    console.log('current block time: ' + starttime)
    await time.latestBlock().then((a) => console.log('current block: ' + a))

    // mint 3kgl to UseA
    await threeKglToken.mint(web3.utils.toWei('100', 'ether'), { from: userA })
    const startingThreeKgl = await threeKglToken.balanceOf(userA)
    console.log('UserA 3kgl: ' + startingThreeKgl)

    //mint muuu to user b to stake
    await muuu.mint(userB, web3.utils.toWei('100', 'ether'))
    const muuuBalance = await muuu.balanceOf(userB)
    console.log('UserB muuu: ' + muuuBalance)
    await muuu.approve(muuuRewardsContract.address, muuuBalance, {
      from: userB,
    })
    await muuuRewardsContract.stakeAll({ from: userB })
    await muuuRewardsContract
      .balanceOf(userB)
      .then((a) => console.log('user b staked muuu: ' + a))

    //approve
    // await threeKglToken.approve(booster.address, 0, { from: userA })
    await threeKglToken.approve(booster.address, startingThreeKgl, {
      from: userA,
    })
    console.log('approved')

    //deposit all for user a
    await booster.depositAll(poolId, true, { from: userA })
    console.log('UserA deposited all')
    //check deposited balance, reward balance, and earned amount(earned should be 0 still)
    const lpTokenBalance = await threeKglToken.balanceOf(userA)
    console.log('UserA lpTokenBalance(should be zero): ' + lpTokenBalance)
    const deposit = await depositToken.balanceOf(userA)
    console.log('UserA depositToken(should be zero): ' + deposit)

    // TODO: add a case in order to check manual stake one
    //if manual stake
    // await depositToken.approve(rewardPool.address,0,{from:userA});
    // await depositToken.approve(rewardPool.address,deposit,{from:userA});
    // await rewardPool.stake(deposit,{from:userA});

    //if auto stake, balance should already be on reward pool

    await depositToken
      .balanceOf(kglRewardPool.address)
      .then((a) =>
        console.log(
          'kglRewardPool depositToken balance(should not be zero): ' + a,
        ),
      )

    await kglRewardPool
      .balanceOf(userA)
      .then((a) => console.log('reward balance(should not be zero): ' + a))
    await kglRewardPool
      .earned(userA)
      .then((a) => console.log('rewards earned(should be 0 still): ' + a))

    //increase time
    await time.increase(86400)
    await time.advanceBlock()
    console.log('advance time...')
    await time.latest().then((a) => console.log('current block time: ' + a))
    await time.latestBlock().then((a) => console.log('current block: ' + a))

    //check pre reward balances
    await kgl.balanceOf(userA).then((a) => console.log('userA kgl: ' + a))
    await muuu.balanceOf(userA).then((a) => console.log('userA muuu: ' + a))

    //claim kgl rewards from gauge and send to reward contract
    await booster.earmarkRewards(poolId, { from: caller })
    console.log('earmarked')

    //check kgl at various addresses, should all be at reward contracts(3) and caller address(gas incentive)
    await kgl
      .balanceOf(mockMinter.address)
      .then((a) => console.log('kgl at mockMinter(should be zero) ' + a))
    await kgl
      .balanceOf(voterProxy.address)
      .then((a) => console.log('kgl at voterProxy(should be zero) ' + a))
    await kgl
      .balanceOf(booster.address)
      .then((a) => console.log('kgl at booster(should be zero) ' + a))
    await kgl
      .balanceOf(caller)
      .then((a) => console.log('kgl at caller(not zero) ' + a))
    await kgl
      .balanceOf(kglRewardPool.address)
      .then((a) => console.log('kgl at kglRewardPool(not zero) ' + a))
    await kgl
      .balanceOf(muKglRewardsContract.address)
      .then((a) => console.log('kgl at muKglRewardsContract(not zero) ' + a))
    await kgl
      .balanceOf(muuuRewardsContract.address)
      .then((a) => console.log('kgl at muuuRewards(not zero) ' + a))
    await kgl
      .balanceOf(userA)
      .then((a) => console.log('userA kgl(should be zero): ' + a))
    await muuu
      .balanceOf(userA)
      .then((a) => console.log('userA muuu(should be zero): ' + a))

    //earned should still be 0
    await kglRewardPool
      .earned(userA)
      .then((a) => console.log('rewards earned(should still be 0): ' + a))

    await time.increase(86400)
    await time.advanceBlock()
    console.log('advance time...')
    await time.latest().then((a) => console.log('current block time: ' + a))
    await time.latestBlock().then((a) => console.log('current block: ' + a))

    //should now have earned amount
    await kglRewardPool
      .earned(userA)
      .then((a) => console.log('rewards earned(unclaimed): ' + a))

    //claim reward, should receive kgl and muuu (muuu should be about half)
    await kglRewardPool.getReward({ from: userA })
    console.log('getReward()')
    await kgl.balanceOf(userA).then((a) => console.log('userA kgl: ' + a))
    await muuu.balanceOf(userA).then((a) => console.log('userA muuu: ' + a))
    await kgl
      .balanceOf(kglRewardPool.address)
      .then((a) => console.log('rewards left: ' + a))

    //advance time
    await time.increase(10 * 86400)
    await time.advanceBlock()
    console.log('advance time...')
    await time.latest().then((a) => console.log('current block time: ' + a))
    await time.latestBlock().then((a) => console.log('current block: ' + a))

    //check earned again
    await kglRewardPool
      .earned(userA)
      .then((a) => console.log('rewards earned(unclaimed): ' + a))

    //claim rewards again
    await kglRewardPool.getReward({ from: userA })
    console.log('getReward()')
    await kgl.balanceOf(userA).then((a) => console.log('userA kgl: ' + a))
    await muuu.balanceOf(userA).then((a) => console.log('userA muuu: ' + a))
    await kglRewardPool
      .earned(userA)
      .then((a) => console.log('rewards earned(unclaimed): ' + a))

    //check rewards left
    await kgl
      .balanceOf(kglRewardPool.address)
      .then((a) => console.log('rewards left: ' + a))

    //earmark again
    await booster.earmarkRewards(poolId, { from: caller })
    console.log('earmarked (2)')
    //kgl on reward contract should have increased again
    await kgl
      .balanceOf(kglRewardPool.address)
      .then((a) => console.log('rewards left: ' + a))
    await kglRewardPool
      .earned(userA)
      .then((a) => console.log('rewards earned(unclaimed): ' + a))

    //advance time some more
    await time.increase(86400)
    await time.advanceBlock()
    console.log('advance time...')
    await time.latest().then((a) => console.log('current block time: ' + a))
    await time.latestBlock().then((a) => console.log('current block: ' + a))

    //claim rewards again
    await kgl
      .balanceOf(kglRewardPool.address)
      .then((a) => console.log('rewards left: ' + a))
    await kglRewardPool
      .earned(userA)
      .then((a) => console.log('rewards earned(unclaimed): ' + a))
    await kglRewardPool.getReward({ from: userA })
    console.log('getReward()')
    await kgl.balanceOf(userA).then((a) => console.log('userA kgl: ' + a))
    await muuu.balanceOf(userA).then((a) => console.log('userA muuu: ' + a))
    await kgl
      .balanceOf(kglRewardPool.address)
      .then((a) => console.log('rewards left: ' + a))

    //advance time
    await time.increase(10 * 86400)
    await time.advanceBlock()
    console.log('advance time...')
    await time.latest().then((a) => console.log('current block time: ' + a))
    await time.latestBlock().then((a) => console.log('current block: ' + a))

    //withdraw should also claim rewards
    await kgl.balanceOf(userA).then((a) => console.log('userA kgl: ' + a))
    await muuu.balanceOf(userA).then((a) => console.log('userA muuu: ' + a))

    //unstake + unwrap + claim
    const rbal = await kglRewardPool.balanceOf(userA)
    await kglRewardPool.withdrawAndUnwrap(rbal, true, { from: userA })
    console.log('withdrawAll()')

    await threeKglToken
      .balanceOf(userA)
      .then((a) => console.log('userA 3kglToken final: ' + a))
    await depositToken
      .balanceOf(userA)
      .then((a) => console.log('final depositToken balance: ' + a))
    await kgl
      .balanceOf(muKglRewardsContract.address)
      .then((a) => console.log('kgl at muKglRewardsContract ' + a))
    await kgl
      .balanceOf(muuuRewardsContract.address)
      .then((a) => console.log('kgl at muuuRewards ' + a))
    await kglRewardPool
      .balanceOf(userA)
      .then((a) => console.log('reward pool balance of user(==0): ' + a))
    await kgl.balanceOf(userA).then((a) => console.log('userA kgl: ' + a))
    await muuu.balanceOf(userA).then((a) => console.log('userA muuu: ' + a))

    //meanwhile user B should be receiving muKgl rewards via muuu staking
    await kgl
      .balanceOf(userB)
      .then((a) => console.log('userB kgl(before claim): ' + a))
    await muKglToken
      .balanceOf(userB)
      .then((a) => console.log('userB muKglToken(before claim): ' + a))
    await muKglRewardsContract
      .balanceOf(userB)
      .then((a) => console.log('userB staked muKglToken(before claim): ' + a))
    await muuuRewardsContract
      .earned(userB)
      .then((a) => console.log('userB earned: ' + a))
    await muuuRewardsContract.getReward(true, { from: userB })
    await kgl
      .balanceOf(userB)
      .then((a) => console.log('userB kgl(after claim): ' + a))
    await muKglToken
      .balanceOf(userB)
      .then((a) => console.log('userB muKglToken(after claim): ' + a))
    await muKglRewardsContract
      .balanceOf(userB)
      .then((a) => console.log('userB staked muKglToken(after claim): ' + a))

    //withdraw from muuu
    await muuu
      .balanceOf(userB)
      .then((a) => console.log('userB muuu on wallet: ' + a))
    const stakedMuuu = await muuuRewardsContract.balanceOf(userB)
    console.log('staked muuu: ' + stakedMuuu)
    await muuuRewardsContract.withdraw(stakedMuuu, true, { from: userB })
    console.log('withdraw()')
    await muuu
      .balanceOf(userB)
      .then((a) => console.log('userB muuu on wallet: ' + a))
    await muuuRewardsContract
      .balanceOf(userB)
      .then((a) => console.log('userB staked muuu: ' + a))
  })
})
