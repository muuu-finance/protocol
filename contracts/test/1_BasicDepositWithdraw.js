const {
  BN,
  constants,
  expectEvent,
  expectRevert,
  time,
} = require('@openzeppelin/test-helpers')

var jsonfile = require('jsonfile')
var contractList = jsonfile.readFileSync('./contracts.json')

const Booster = artifacts.require('Booster')
const KglDepositor = artifacts.require('KglDepositor')
const KaglaVoterProxy = artifacts.require('KaglaVoterProxy')
const ExtraRewardStashV2 = artifacts.require('ExtraRewardStashV2')
const BaseRewardPool = artifacts.require('BaseRewardPool')
const VirtualBalanceRewardPool = artifacts.require('VirtualBalanceRewardPool')
const muuuRewardPool = artifacts.require('muuuRewardPool')
const MuuuToken = artifacts.require('MuuuToken')
const muKglToken = artifacts.require('muKglToken')
const StashFactory = artifacts.require('StashFactory')
const RewardFactory = artifacts.require('RewardFactory')

const IExchange = artifacts.require('IExchange')
const IKaglaFi = artifacts.require('I3KaglaFi')
const IERC20 = artifacts.require('IERC20')

contract('BasicDepositWithdraw', async (accounts) => {
  it('should test basic deposits and withdrawals', async () => {
    let kgl = await IERC20.at('0xD533a949740bb3306d119CC777fa900bA034cd52')
    let weth = await IERC20.at('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2')
    let dai = await IERC20.at('0x6b175474e89094c44da98b954eedeac495271d0f')
    let exchange = await IExchange.at(
      '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    )
    let threekglswap = await IKaglaFi.at(
      '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7',
    )
    let threeKgl = await IERC20.at('0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490')
    let threeKglGauge = '0xbFcF63294aD7105dEa65aA58F8AE5BE2D9d0952A'
    let threeKglSwap = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7'
    let vekglFeeDistro = '0xA464e6DCda8AC41e03616F95f4BC98a13b8922Dc'

    let admin = accounts[0]
    let userA = accounts[1]
    let userB = accounts[2]
    let caller = accounts[3]

    //system setup
    let voteproxy = await KaglaVoterProxy.at(contractList.system.voteProxy)
    let booster = await Booster.deployed()
    let voterewardFactoryproxy = await RewardFactory.deployed()
    let stashFactory = await StashFactory.deployed()
    let muuu = await MuuuToken.deployed()
    let muKgl = await muKglToken.deployed()
    let kglDeposit = await KglDepositor.deployed()
    let muKglRewards = await booster.lockRewards()
    let muuuRewards = await booster.stakerRewards()

    var poolId = contractList.pools.find((pool) => pool.name == '3pool').id
    console.log('pool id: ' + poolId)
    let poolinfo = await booster.poolInfo(poolId)
    let rewardPoolAddress = poolinfo.kglRewards
    let rewardPool = await BaseRewardPool.at(rewardPoolAddress)
    let depositToken = await IERC20.at(poolinfo.token)
    console.log('pool lp token ' + poolinfo.lptoken)
    console.log('pool gauge ' + poolinfo.gauge)
    console.log('pool reward contract at ' + rewardPool.address)
    let starttime = await time.latest()
    console.log('current block time: ' + starttime)

    //exchange weth for dai
    await weth.sendTransaction({
      value: web3.utils.toWei('2.0', 'ether'),
      from: userA,
    })
    let startingWeth = await weth.balanceOf(userA)
    await weth.approve(exchange.address, startingWeth, { from: userA })
    await exchange.swapExactTokensForTokens(
      startingWeth,
      0,
      [weth.address, dai.address],
      userA,
      starttime + 3000,
      { from: userA },
    )
    let startingDai = await dai.balanceOf(userA)

    //deposit dai for 3kgl
    await dai.approve(threekglswap.address, startingDai, { from: userA })
    await threekglswap.add_liquidity([startingDai, 0, 0], 0, { from: userA })
    let startingThreeKgl = await threeKgl.balanceOf(userA)
    console.log('3kgl: ' + startingThreeKgl)

    //approve
    await threeKgl.approve(booster.address, 0, { from: userA })
    await threeKgl.approve(booster.address, startingThreeKgl, { from: userA })

    //first try depositing too much
    console.log('try depositing too much')
    await expectRevert(
      booster.deposit(poolId, startingThreeKgl + 1, false, { from: userA }),
      'SafeERC20',
    )
    console.log(' ->reverted')

    //deposit a small portion
    await booster.deposit(poolId, web3.utils.toWei('500.0', 'ether'), false, {
      from: userA,
    })
    console.log('deposited portion')

    //check wallet balance and deposit credit
    await threeKgl
      .balanceOf(userA)
      .then((a) => console.log('wallet balance: ' + a))
    await depositToken
      .balanceOf(userA)
      .then((a) => console.log('lp balance: ' + a))
    //should not be staked
    await rewardPool
      .balanceOf(userA)
      .then((a) => console.log('staked balance: ' + a))
    //should be staked on kagla even if not staked in rewards
    await voteproxy
      .balanceOfPool(threeKglGauge)
      .then((a) => console.log('gauge balance: ' + a))

    //deposit reset of funds
    await booster.depositAll(poolId, false, { from: userA })
    console.log('deposited all')

    //check wallet balance and deposit credit
    await threeKgl
      .balanceOf(userA)
      .then((a) => console.log('wallet balance: ' + a))
    await depositToken
      .balanceOf(userA)
      .then((a) => console.log('lp balance: ' + a))

    //should not be staked
    await rewardPool
      .balanceOf(userA)
      .then((a) => console.log('staked balance: ' + a))
    //check if staked on kagla
    await voteproxy
      .balanceOfPool(threeKglGauge)
      .then((a) => console.log('gauge balance: ' + a))

    //withdraw a portion
    await booster.withdraw(poolId, web3.utils.toWei('500.0', 'ether'), {
      from: userA,
    })
    console.log('withdrawn portion')

    //check wallet increased and that deposit credit decreased
    await threeKgl
      .balanceOf(userA)
      .then((a) => console.log('wallet balance: ' + a))
    await depositToken
      .balanceOf(userA)
      .then((a) => console.log('lp balance: ' + a))

    //withdraw too much error check
    // this will error on the gauge not having enough balance
    console.log('try withdraw too much')
    await expectRevert(
      booster.withdraw(poolId, startingThreeKgl + 1, { from: userA }),
      'revert',
    )
    console.log(' ->reverted (fail on unstake)')

    ///add funds for user B
    await weth.sendTransaction({
      value: web3.utils.toWei('2.0', 'ether'),
      from: userB,
    })
    await weth.approve(exchange.address, web3.utils.toWei('2.0', 'ether'), {
      from: userB,
    })
    await exchange.swapExactTokensForTokens(
      web3.utils.toWei('2.0', 'ether'),
      0,
      [weth.address, dai.address],
      userB,
      starttime + 3000,
      { from: userB },
    )
    let userBDai = await dai.balanceOf(userB)
    await dai.approve(threekglswap.address, userBDai, { from: userB })
    await threekglswap.add_liquidity([userBDai, 0, 0], 0, { from: userB })
    let userBThreeKgl = await threeKgl.balanceOf(userB)
    await threeKgl.approve(booster.address, 0, { from: userB })
    await threeKgl.approve(booster.address, userBThreeKgl, { from: userB })
    await booster.depositAll(poolId, false, { from: userB })
    await depositToken
      .balanceOf(userB)
      .then((a) => console.log('lp balance: ' + a))

    //withdraw too much error check again
    // this will error on the deposit balance not being high enough (gauge balance check passes though because of userB)
    //update: ordering of unstake and burn changed so burn is always first.
    console.log('try withdraw too much(2)')
    await expectRevert(
      booster.withdraw(poolId, startingThreeKgl + 1, { from: userA }),
      'revert',
    )
    console.log(' ->reverted (fail on user funds)')

    await voteproxy
      .balanceOfPool(threeKglGauge)
      .then((a) => console.log('gauge balance: ' + a))

    //withdraw all properly
    await booster.withdrawAll(poolId, { from: userA })
    console.log('withdrawAll A')

    //all balance should be back on wallet and equal to starting value
    await threeKgl
      .balanceOf(userA)
      .then((a) => console.log('userA wallet balance: ' + a))
    await depositToken
      .balanceOf(userA)
      .then((a) => console.log('userA lp balance: ' + a))
    await rewardPool
      .balanceOf(userA)
      .then((a) => console.log('userA staked balance: ' + a))
    await voteproxy
      .balanceOfPool(threeKglGauge)
      .then((a) => console.log('gauge balance: ' + a))

    //withdraw all properly
    await booster.withdrawAll(poolId, { from: userB })
    console.log('withdrawAll B')
    await threeKgl
      .balanceOf(userB)
      .then((a) => console.log('userB wallet balance: ' + a))
    await depositToken
      .balanceOf(userB)
      .then((a) => console.log('userB lp balance: ' + a))
    await rewardPool
      .balanceOf(userB)
      .then((a) => console.log('userB staked balance: ' + a))
    await voteproxy
      .balanceOfPool(threeKglGauge)
      .then((a) => console.log('gauge balance: ' + a))
  })
})
