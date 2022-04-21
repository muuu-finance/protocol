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

const setupContracts = async () => {
  const kgl = await MintableERC20.new('kgl', 'KGL', 18)
  const threeKglToken = await MintableERC20.new('3KGL Token', '3Kgl', 18)
  const mockVotingEscrow = await MockVotingEscrow.new()

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
  const muuu = await MuuuToken.new()
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

  await poolManager.addPool(threeKglToken.address, threeKglGaugeAddress, 0)
  const poolId = 0
  const poolinfo = await booster.poolInfo(poolId)
  const rewardPoolAddress = poolinfo.kglRewards
  const rewardPool = await BaseRewardPool.at(rewardPoolAddress)
  const depositToken = await IERC20.at(poolinfo.token)
  console.log('pool lp token ' + poolinfo.lptoken)
  console.log('pool gauge ' + poolinfo.gauge)
  console.log('pool reward contract at ' + rewardPool.address)

  console.log('Setup completed successfully!')

  return {
    threeKglToken,
    threeKglGaugeAddress,
    booster,
    depositToken,
    rewardPool,
    voterProxy,
    poolId,
  }
}

contract('BasicDepositWithdraw', async (accounts) => {
  it('should test basic deposits and withdrawals', async () => {
    // accounts
    const admin = accounts[0]
    const userA = accounts[1]
    const userB = accounts[2]
    const caller = accounts[3]

    const {
      threeKglToken,
      threeKglGaugeAddress,
      booster,
      depositToken,
      rewardPool,
      voterProxy,
      poolId,
    } = await setupContracts()

    //mint threeKglToken to userA (pretend that userA had deposited)
    await threeKglToken.mint(web3.utils.toWei('100', 'ether'), { from: userA })
    const threeKglTokenBalance = await threeKglToken.balanceOf(userA)
    console.log('3KglTokenBalance:', threeKglTokenBalance.toString())

    //approve
    // await threeKglToken.approve(booster.address, 0, { from: userA })
    await threeKglToken.approve(booster.address, threeKglTokenBalance, {
      from: userA,
    })

    //first try depositing too much
    console.log('try depositing too much')
    await expectRevert(
      booster.deposit(poolId, threeKglTokenBalance + 1, false, { from: userA }),
      'Revert (message: ERC20: transfer amount exceeds balance)',
    )
    console.log(' ->reverted')

    //deposit a small portion
    await booster.deposit(poolId, web3.utils.toWei('50.0', 'ether'), false, {
      from: userA,
    })
    console.log('deposited portion')

    //check wallet balance and deposit credit
    const threeKglTokenBalanceAfterDeposit = await threeKglToken.balanceOf(
      userA,
    )
    console.log(
      'threeKglTokenBalance:',
      threeKglTokenBalanceAfterDeposit.toString(),
    )
    const depositTokenBalance = await depositToken.balanceOf(userA)
    console.log('depositTokenBalance:', depositTokenBalance.toString())

    //should not be staked
    const stakedBalance = await rewardPool.balanceOf(userA)
    console.log('stakedBalance(should be zero):', stakedBalance.toString())

    //should be staked on kagla even if not staked in rewards
    const gaugeBalance = await voterProxy.balanceOfPool(threeKglGaugeAddress)
    console.log('gaugeBalance:', gaugeBalance.toString())

    //deposit all
    await booster.depositAll(poolId, false, { from: userA })
    console.log('deposited all')

    //check wallet balance and deposit credit
    const threeKglTokenBalanceAfterDepositAll = await threeKglToken.balanceOf(
      userA,
    )
    console.log(
      'threeKglTokenBalanceAfterDepositAll(should be zero):',
      threeKglTokenBalanceAfterDepositAll.toString(),
    )
    const depositTokenBalanceAfterDepositAll = await depositToken.balanceOf(
      userA,
    )
    console.log(
      'depositTokenBalanceAfterDepositAll:',
      depositTokenBalanceAfterDepositAll.toString(),
    )

    //should not be staked
    const stakedBalanceAfterDepositAll = await rewardPool.balanceOf(userA)
    console.log(
      'stakedBalanceAfterDepositAll(should be zero):',
      stakedBalanceAfterDepositAll.toString(),
    )

    //check if staked on kagla
    const gaugeBalanceAfterDepositAll = await voterProxy.balanceOfPool(
      threeKglGaugeAddress,
    )
    console.log(
      'gaugeBalanceAfterDepositAll:',
      gaugeBalanceAfterDepositAll.toString(),
    )

    //withdraw a portion
    await booster.withdraw(poolId, web3.utils.toWei('50.0', 'ether'), {
      from: userA,
    })
    console.log('withdrawn portion')

    //check wallet increased and that deposit credit decreased
    const threeKglTokenBalanceAfterWithdraw = await threeKglToken.balanceOf(
      userA,
    )
    console.log(
      'threeKglTokenBalanceAfterWithdraw:',
      threeKglTokenBalanceAfterWithdraw.toString(),
    )
    const depositTokenBalanceAfterWithdraw = await depositToken.balanceOf(userA)
    console.log(
      'depositTokenBalanceAfterWithdraw:',
      depositTokenBalanceAfterWithdraw.toString(),
    )

    // withdraw too much error check
    // this will error on the gauge not having enough balance
    console.log('try withdraw too much')
    await expectRevert(
      booster.withdraw(poolId, threeKglTokenBalance + 1, { from: userA }),
      'Revert (message: ERC20: burn amount exceeds balance)',
    )
    console.log(' ->reverted (fail on unstake)')

    //mint threeKglToken to userB (pretend that userB had deposited)
    await threeKglToken.mint(web3.utils.toWei('100', 'ether'), { from: userB })
    const threeKglTokenBalanceB = await threeKglToken.balanceOf(userB)
    // await threeKglToken.approve(booster.address, 0, { from: userB })
    await threeKglToken.approve(booster.address, threeKglTokenBalanceB, {
      from: userB,
    })
    await booster.depositAll(poolId, false, { from: userB })
    console.log('UserB has deposited all.')

    // withdraw too much error check again
    // to check gauge balance passes though because of userB but burn is first. so errur orrured
    console.log('try withdraw too much(2)')
    await expectRevert(
      booster.withdraw(poolId, threeKglTokenBalance + 1, { from: userA }),
      'Revert (message: ERC20: burn amount exceeds balance)',
    )
    console.log(' ->reverted (fail on user funds)')

    //withdraw all properly
    await booster.withdrawAll(poolId, { from: userA })
    console.log('withdrawAll A')

    //all balance should be back on wallet and equal to starting value
    const finalThreeKglTokenBalanceA = await threeKglToken.balanceOf(userA)
    console.log('userA wallet balance:', finalThreeKglTokenBalanceA.toString())
    const finalDepositTokenBalanceA = await depositToken.balanceOf(userA)
    console.log('userA lp balance:', finalDepositTokenBalanceA.toString())
    const finalRewardPoolBalanceA = await rewardPool.balanceOf(userA)
    console.log('userA staked balance:', finalRewardPoolBalanceA.toString())
    const semiFinalThreeKglGaugeBalance = await voterProxy.balanceOfPool(
      threeKglGaugeAddress,
    )
    console.log('gauge balance:', semiFinalThreeKglGaugeBalance.toString())

    //withdraw all properly
    await booster.withdrawAll(poolId, { from: userB })
    console.log('withdrawAll UserB')
    const finalThreeKglTokenBalanceB = await threeKglToken.balanceOf(userB)
    console.log('userB wallet balance:', finalThreeKglTokenBalanceB.toString())
    const finalDepositTokenBalanceB = await depositToken.balanceOf(userB)
    console.log('userB lp balance:', finalDepositTokenBalanceA.toString())
    const finalRewardPoolBalanceB = await rewardPool.balanceOf(userB)
    console.log('userB staked balance:', finalRewardPoolBalanceB.toString())
    const finalThreeKglGaugeBalance = await voterProxy.balanceOfPool(
      threeKglGaugeAddress,
    )
    console.log('gauge balance:', finalThreeKglGaugeBalance.toString())
  })
})
