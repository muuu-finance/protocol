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
const DepositToken = artifacts.require('DepositToken')

const IExchange = artifacts.require('IExchange')
const IKaglaFi = artifacts.require('I3KaglaFi')
const IERC20 = artifacts.require('IERC20')
const ERC20 = artifacts.require('ERC20')

contract('RewardsTest', async (accounts) => {
  it('should deposit and receive kgl and muuu rewards', async () => {
    let kgl = await IERC20.at('0xD533a949740bb3306d119CC777fa900bA034cd52')
    let weth = await IERC20.at('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2')
    let dai = await IERC20.at('0x6b175474e89094c44da98b954eedeac495271d0f')
    let exchange = await IExchange.at(
      '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    )
    let sushiexchange = await IExchange.at(
      '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
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
    //system setup
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
    let depositToken = await ERC20.at(poolinfo.token)
    console.log('pool lp token ' + poolinfo.lptoken)
    console.log('pool gauge ' + poolinfo.gauge)
    console.log('pool reward contract at ' + rewardPool.address)
    let depositTokenOp = await DepositToken.at(poolinfo.token)
    await depositToken
      .name()
      .then((a) => console.log('deposit token name: ' + a))
    await depositToken
      .symbol()
      .then((a) => console.log('deposit token symbol: ' + a))
    await depositTokenOp
      .operator()
      .then((a) => console.log('deposit token operator: ' + a))

    //increase time so that muuu rewards start
    await time.increase(10 * 86400)
    await time.advanceBlock()
    console.log('advance time...')

    let starttime = await time.latest()
    console.log('current block time: ' + starttime)
    await time.latestBlock().then((a) => console.log('current block: ' + a))

    //exchange for dai and deposit for 3kgl
    await weth.sendTransaction({
      value: web3.utils.toWei('2.0', 'ether'),
      from: userA,
    })
    let startingWeth = await weth.balanceOf(userA)
    await weth.approve(exchange.address, startingWeth, { from: userA })
    await exchange.swapExactTokensForTokens(
      web3.utils.toWei('1.0', 'ether'),
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

    //send muuu to user b to stake
    await weth.approve(sushiexchange.address, startingWeth, { from: userA })
    await sushiexchange.swapExactTokensForTokens(
      web3.utils.toWei('1.0', 'ether'),
      0,
      [weth.address, muuu.address],
      userB,
      starttime + 3000,
      { from: userA },
    )
    let muuuBal = await muuu.balanceOf(userB)
    console.log('exchanged for muuu: ' + muuuBal)
    await muuu.approve(muuuRewardsContract.address, muuuBal, { from: userB })
    await muuuRewardsContract.stakeAll({ from: userB })
    await muuuRewardsContract
      .balanceOf(userB)
      .then((a) => console.log('user b staked muuu: ' + a))

    //approve
    await threeKgl.approve(booster.address, 0, { from: userA })
    await threeKgl.approve(booster.address, startingThreeKgl, { from: userA })
    console.log('approved')

    //deposit all for user a
    await booster.depositAll(poolId, true, { from: userA })
    console.log('deposit all complete')
    //check deposited balance, reward balance, and earned amount(earned should be 0 still)
    //await booster.userPoolInfo(0,userA).then(a=>console.log("deposited lp: " +a));
    var deposit = await depositToken.balanceOf(userA)
    console.log('deposited lp: ' + deposit)

    //if manual stake
    // await depositToken.approve(rewardPool.address,0,{from:userA});
    // await depositToken.approve(rewardPool.address,deposit,{from:userA});
    // await rewardPool.stake(deposit,{from:userA});

    //if auto stake, balance should already be on reward pool

    await rewardPool
      .balanceOf(userA)
      .then((a) => console.log('reward balance: ' + a))
    await rewardPool
      .earned(userA)
      .then((a) => console.log('rewards earned(unclaimed): ' + a))

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
      .balanceOf(voteproxy.address)
      .then((a) => console.log('kgl at voteproxy ' + a))
    await kgl
      .balanceOf(booster.address)
      .then((a) => console.log('kgl at booster ' + a))
    await kgl.balanceOf(caller).then((a) => console.log('kgl at caller ' + a))
    await kgl
      .balanceOf(rewardPool.address)
      .then((a) => console.log('kgl at reward pool ' + a))
    await kgl
      .balanceOf(muKglRewards)
      .then((a) => console.log('kgl at muKglRewards ' + a))
    await kgl
      .balanceOf(muuuRewards)
      .then((a) => console.log('kgl at muuuRewards ' + a))
    await kgl.balanceOf(userA).then((a) => console.log('userA kgl: ' + a))
    await muuu.balanceOf(userA).then((a) => console.log('userA muuu: ' + a))

    //earned should still be 0
    await rewardPool
      .earned(userA)
      .then((a) => console.log('rewards earned(unclaimed): ' + a))

    await time.increase(86400)
    await time.advanceBlock()
    console.log('advance time...')
    await time.latest().then((a) => console.log('current block time: ' + a))
    await time.latestBlock().then((a) => console.log('current block: ' + a))

    //should now have earned amount
    await rewardPool
      .earned(userA)
      .then((a) => console.log('rewards earned(unclaimed): ' + a))

    //claim reward, should receive kgl and muuu (muuu should be about half)
    await rewardPool.getReward({ from: userA })
    console.log('getReward()')
    await kgl.balanceOf(userA).then((a) => console.log('userA kgl: ' + a))
    await muuu.balanceOf(userA).then((a) => console.log('userA muuu: ' + a))
    await kgl
      .balanceOf(rewardPool.address)
      .then((a) => console.log('rewards left: ' + a))

    //advance time
    await time.increase(10 * 86400)
    await time.advanceBlock()
    console.log('advance time...')
    await time.latest().then((a) => console.log('current block time: ' + a))
    await time.latestBlock().then((a) => console.log('current block: ' + a))

    //check earned again
    await rewardPool
      .earned(userA)
      .then((a) => console.log('rewards earned(unclaimed): ' + a))

    //claim rewards again
    await rewardPool.getReward({ from: userA })
    console.log('getReward()')
    await kgl.balanceOf(userA).then((a) => console.log('userA kgl: ' + a))
    await muuu.balanceOf(userA).then((a) => console.log('userA muuu: ' + a))
    await rewardPool
      .earned(userA)
      .then((a) => console.log('rewards earned(unclaimed): ' + a))

    //check rewards left
    await kgl
      .balanceOf(rewardPool.address)
      .then((a) => console.log('rewards left: ' + a))

    //earmark again
    await booster.earmarkRewards(poolId, { from: caller })
    console.log('earmarked (2)')
    //kgl on reward contract should have increased again
    await kgl
      .balanceOf(rewardPool.address)
      .then((a) => console.log('rewards left: ' + a))
    await rewardPool
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
      .balanceOf(rewardPool.address)
      .then((a) => console.log('rewards left: ' + a))
    await rewardPool
      .earned(userA)
      .then((a) => console.log('rewards earned(unclaimed): ' + a))
    await rewardPool.getReward({ from: userA })
    console.log('getReward()')
    await kgl.balanceOf(userA).then((a) => console.log('userA kgl: ' + a))
    await muuu.balanceOf(userA).then((a) => console.log('userA muuu: ' + a))
    await kgl
      .balanceOf(rewardPool.address)
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
    let rbal = await rewardPool.balanceOf(userA)
    await rewardPool.withdrawAndUnwrap(rbal, true, { from: userA })
    console.log('withdrawAll()')

    await threeKgl
      .balanceOf(userA)
      .then((a) => console.log('userA 3kgl final: ' + a))
    await depositToken
      .balanceOf(userA)
      .then((a) => console.log('final lp balance: ' + a))
    await kgl
      .balanceOf(muKglRewards)
      .then((a) => console.log('kgl at muKglRewards ' + a))
    await kgl
      .balanceOf(muuuRewards)
      .then((a) => console.log('kgl at muuuRewards ' + a))
    await rewardPool
      .balanceOf(userA)
      .then((a) => console.log('reward pool balance of user(==0): ' + a))
    await kgl.balanceOf(userA).then((a) => console.log('userA kgl: ' + a))
    await muuu.balanceOf(userA).then((a) => console.log('userA muuu: ' + a))

    //meanwhile user B should be receiving muKgl rewards via muuu staking
    await kgl
      .balanceOf(userB)
      .then((a) => console.log('userB kgl(before claim): ' + a))
    await muKgl
      .balanceOf(userB)
      .then((a) => console.log('userB muKgl(before claim): ' + a))
    await muKglRewardsContract
      .balanceOf(userB)
      .then((a) => console.log('userB staked muKgl(before claim): ' + a))
    await muuuRewardsContract
      .earned(userB)
      .then((a) => console.log('userB earned: ' + a))
    //await muuuRewardsContract.getReward(false,{from:userB});
    await muuuRewardsContract.getReward(true, { from: userB })
    await kgl
      .balanceOf(userB)
      .then((a) => console.log('userB kgl(after claim): ' + a))
    await muKgl
      .balanceOf(userB)
      .then((a) => console.log('userB muKgl(after claim): ' + a))
    await muKglRewardsContract
      .balanceOf(userB)
      .then((a) => console.log('userB staked muKgl(after claim): ' + a))

    //withdraw from muuu
    await muuu
      .balanceOf(userB)
      .then((a) => console.log('userB muuu on wallet: ' + a))
    var stakedMuuu = await muuuRewardsContract.balanceOf(userB)
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
