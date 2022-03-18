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
//const muKglRewardPool = artifacts.require("muKglRewardPool");
const muuuRewardPool = artifacts.require('MuuuRewardPool')
const MuuuToken = artifacts.require('MuuuToken')
const muKglToken = artifacts.require('MuKglToken')
const StashFactory = artifacts.require('StashFactory')
const RewardFactory = artifacts.require('RewardFactory')

const IExchange = artifacts.require('IExchange')
const IKaglaFi = artifacts.require('I3KaglaFi')
const IERC20 = artifacts.require('IERC20')

contract('muKgl Rewards', async (accounts) => {
  it('should deposit and gain rewrds with muKgl', async () => {
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

    let admin = accounts[0]
    let userA = accounts[1]
    let userB = accounts[2]
    let caller = accounts[3]

    //system
    let voteproxy = await KaglaVoterProxy.at(contractList.system.voteProxy)
    let booster = await Booster.deployed()
    let rewardFactory = await RewardFactory.deployed()
    let stashFactory = await StashFactory.deployed()
    let muuu = await MuuuToken.deployed()
    let muKgl = await muKglToken.deployed()
    let kglDeposit = await KglDepositor.deployed()
    let muKglRewards = await booster.lockRewards()
    let muuuRewards = await booster.stakerRewards()
    let muKglRewardsContract = await BaseRewardPool.at(muKglRewards)
    let muuuRewardsContract = await muuuRewardPool.at(muuuRewards)

    var poolId = contractList.pools.find((pool) => pool.name == '3pool').id
    let poolinfo = await booster.poolInfo(poolId)
    let rewardPoolAddress = poolinfo.kglRewards
    let rewardPool = await BaseRewardPool.at(rewardPoolAddress)

    //advance to start muuu farming
    await time.increase(10 * 86400)
    await time.advanceBlock()
    await time.advanceBlock()

    let starttime = await time.latest()
    console.log('current block time: ' + starttime)
    await time.latestBlock().then((a) => console.log('current block: ' + a))

    //exchange and deposit for 3kgl
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
    await dai.approve(threekglswap.address, startingDai, { from: userA })
    await threekglswap.add_liquidity([startingDai, 0, 0], 0, { from: userA })
    let startingThreeKgl = await threeKgl.balanceOf(userA)
    console.log('3kgl: ' + startingThreeKgl)

    //approve and deposit 3kgl
    await threeKgl.approve(booster.address, 0, { from: userA })
    await threeKgl.approve(booster.address, startingThreeKgl, { from: userA })

    await booster.depositAll(0, true, { from: userA })
    await rewardPool
      .balanceOf(userA)
      .then((a) => console.log('deposited lp: ' + a))
    await rewardPool
      .balanceOf(userA)
      .then((a) => console.log('reward balance: ' + a))
    await rewardPool
      .earned(userA)
      .then((a) => console.log('rewards earned(unclaimed): ' + a))
    console.log('deposited lp tokens')

    //exchange for kgl
    await weth.sendTransaction({
      value: web3.utils.toWei('1.0', 'ether'),
      from: userA,
    })
    let wethForKgl = await weth.balanceOf(userA)
    await weth.approve(exchange.address, 0, { from: userA })
    await weth.approve(exchange.address, wethForKgl, { from: userA })
    await exchange.swapExactTokensForTokens(
      wethForKgl,
      0,
      [weth.address, kgl.address],
      userA,
      starttime + 3000,
      { from: userA },
    )
    let startingkgl = await kgl.balanceOf(userA)
    console.log('kgl: ' + startingkgl)

    //deposit kgl
    await kgl.approve(kglDeposit.address, 0, { from: userA })
    await kgl.approve(kglDeposit.address, startingkgl, { from: userA })
    await kglDeposit.deposit(
      startingkgl,
      true,
      '0x0000000000000000000000000000000000000000',
      {
        from: userA,
      },
    )
    console.log('kgl deposited')
    await muKgl
      .balanceOf(userA)
      .then((a) => console.log('muKgl on wallet: ' + a))
    //stake muKgl
    console.log('stake at ' + muKglRewardsContract.address)
    await muKgl.approve(muKglRewardsContract.address, 0, { from: userA })
    await muKgl.approve(muKglRewardsContract.address, startingkgl, {
      from: userA,
    })
    console.log('stake approve')
    await muKglRewardsContract.stakeAll({ from: userA })
    console.log('staked')

    //check balances, depositor should still have kgl since no whitelist
    await muKgl
      .balanceOf(userA)
      .then((a) => console.log('muKgl on wallet: ' + a))
    await muKglRewardsContract
      .balanceOf(userA)
      .then((a) => console.log('muKgl staked: ' + a))
    await kgl
      .balanceOf(kglDeposit.address)
      .then((a) => console.log('kgl on depositor: ' + a))
    await muKgl.totalSupply().then((a) => console.log('muKgl supply: ' + a))

    //advance time
    await time.increase(86400)
    await time.advanceBlock()
    await time.advanceBlock()
    console.log('advance time....')
    await time.latest().then((a) => console.log('current block time: ' + a))
    await time.latestBlock().then((a) => console.log('current block: ' + a))

    //distribute rewards
    await booster.earmarkRewards(0, { from: caller })
    console.log('earmark')
    await kgl
      .balanceOf(voteproxy.address)
      .then((a) => console.log('proxy kgl(==0): ' + a))
    await kgl
      .balanceOf(kglDeposit.address)
      .then((a) => console.log('depositor kgl(>0): ' + a))
    await kgl.balanceOf(userA).then((a) => console.log('userA kgl(==0): ' + a))
    await kgl.balanceOf(caller).then((a) => console.log('caller kgl(>0): ' + a))
    await kgl
      .balanceOf(muKglRewards)
      .then((a) => console.log('kgl at muKglRewards ' + a))
    await kgl
      .balanceOf(muuuRewards)
      .then((a) => console.log('kgl at muuuRewards ' + a))

    //check earned(should be 0)
    await muKglRewardsContract
      .earned(userA)
      .then((a) => console.log('current earned: ' + a))

    await time.increase(3 * 86400)
    await time.advanceBlock()
    await time.advanceBlock()
    await time.advanceBlock()
    await time.advanceBlock()
    await time.advanceBlock()
    console.log('advance time....')

    //check earned
    await muKglRewardsContract
      .earned(userA)
      .then((a) => console.log('current earned: ' + a))
    //claim
    await muKglRewardsContract.getReward({ from: userA })
    console.log('getReward()')

    await kgl
      .balanceOf(muKglRewards)
      .then((a) => console.log('kgl at muKglRewards ' + a))
    await muKglRewardsContract
      .earned(userA)
      .then((a) => console.log('current earned: ' + a))
    await muKgl
      .balanceOf(userA)
      .then((a) => console.log('muKgl on wallet: ' + a))
    await kgl.balanceOf(userA).then((a) => console.log('kgl on wallet: ' + a))
    await muuu.balanceOf(userA).then((a) => console.log('muuu on wallet: ' + a))

    //advance time
    await time.increase(10 * 86400)
    await time.advanceBlock()
    await time.advanceBlock()
    console.log('advance time....')

    //claim rewards again
    await muKglRewardsContract
      .earned(userA)
      .then((a) => console.log('current earned: ' + a))
    await muKglRewardsContract.getReward({ from: userA })
    console.log('getReward()')

    await kgl
      .balanceOf(muKglRewards)
      .then((a) => console.log('kgl at muKglRewards ' + a))
    await muKglRewardsContract
      .earned(userA)
      .then((a) => console.log('current earned: ' + a))
    await muKgl
      .balanceOf(userA)
      .then((a) => console.log('muKgl on wallet: ' + a))
    await kgl.balanceOf(userA).then((a) => console.log('kgl on wallet: ' + a))
    await muuu.balanceOf(userA).then((a) => console.log('muuu on wallet: ' + a))

    //distribute again
    await booster.earmarkRewards(0)
    console.log('earmark 2')
    await kgl
      .balanceOf(muKglRewards)
      .then((a) => console.log('kgl at muKglRewards ' + a))
    await kgl
      .balanceOf(muuuRewards)
      .then((a) => console.log('kgl at muuuRewards ' + a))

    await time.increase(3 * 86400)
    await time.advanceBlock()
    await time.advanceBlock()
    await time.advanceBlock()
    await time.advanceBlock()
    await time.advanceBlock()
    console.log('advance time....')

    //rewards should be earning again
    await muKglRewardsContract
      .earned(userA)
      .then((a) => console.log('current earned: ' + a))
    await muKglRewardsContract.getReward({ from: userA })
    console.log('getReward()')

    await kgl
      .balanceOf(muKglRewards)
      .then((a) => console.log('kgl at muKglRewards ' + a))
    await muKglRewardsContract
      .earned(userA)
      .then((a) => console.log('current earned: ' + a))
    await muKgl
      .balanceOf(userA)
      .then((a) => console.log('muKgl on wallet: ' + a))
    await kgl.balanceOf(userA).then((a) => console.log('kgl on wallet: ' + a))
    await muuu.balanceOf(userA).then((a) => console.log('muuu on wallet: ' + a))
  })
})
