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
const muuuRewardPool = artifacts.require('muuuRewardPool')
const MuuuToken = artifacts.require('MuuuToken')
const muKglToken = artifacts.require('muKglToken')
const StashFactory = artifacts.require('StashFactory')
const RewardFactory = artifacts.require('RewardFactory')

const IExchange = artifacts.require('IExchange')
const IERC20 = artifacts.require('IERC20')
const IKaglaGauge = artifacts.require('IKaglaGauge')
const IKaglaGaugeDebug = artifacts.require('IKaglaGaugeDebug')
const IWalletCheckerDebug = artifacts.require('IWalletCheckerDebug')
const IBurner = artifacts.require('IBurner')

contract('VeKgl Fees Test', async (accounts) => {
  it('should add to whitelist, lock kgl, test vekgl fee distribution', async () => {
    let kgl = await IERC20.at('0xD533a949740bb3306d119CC777fa900bA034cd52')
    let weth = await IERC20.at('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2')
    let wbtc = await IERC20.at('0x2260fac5e5542a773aa44fbcfedf7c193bc2c599')
    let dai = await IERC20.at('0x6B175474E89094C44Da98b954EedeAC495271d0F')
    let vekgl = await IERC20.at('0x5f3b5DfEb7B28CDbD7FAba78963EE202a494e2A2')
    let threekgl = await IERC20.at('0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490')
    let exchange = await IExchange.at(
      '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    ) // UniswapV2Router02
    let walletChecker = await IWalletCheckerDebug.at(
      '0xca719728Ef172d0961768581fdF35CB116e0B7a4',
    ) // SmartWalletWhitelist (もう使っていないかも)
    let checkerAdmin = '0x40907540d8a6C65c637785e8f8B742ae6b0b9968' // CurveFi Ownership Agent (Proxy / Agent=0x3a93c17fc82cc33420d1809dda9fb715cc89dd37)
    let vekglWhale = '0xb01151B93B5783c252333Ce0707D704d0BBDF5EC' // pure account address? ほぼ token なく、transaction もしばらくない // ここに移行された? (https://etherscan.io/address/0xc5e6081e7fd4fe2c180e670a3c117a3649a9b7c2)

    //memo: these burner addresses may change
    let burner = await IBurner.at('0xeCb456EA5365865EbAb8a2661B0c503410e9B347') // Curve StableSwap Proxy https://curve.readthedocs.io/dao-fees.html#lpburner
    let underlyingburner = await IBurner.at(
      '0x786B374B5eef874279f4B7b4de16940e57301A58', // Underlying Burner https://curve.readthedocs.io/dao-fees.html#underlyingburner
    )
    ///////

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
    let vekglRewards = await booster.lockFees()
    let muKglRewardsContract = await BaseRewardPool.at(muKglRewards)
    let muuuRewardsContract = await muuuRewardPool.at(muuuRewards)
    let vekglRewardsContract = await VirtualBalanceRewardPool.at(vekglRewards)

    let starttime = await time.latest()
    console.log('current block time: ' + starttime)
    await time.latestBlock().then((a) => console.log('current block: ' + a))

    //add to whitelist
    await walletChecker.approveWallet(voteproxy.address, {
      from: checkerAdmin,
      gasPrice: 0,
    })
    console.log('approve wallet')
    let isWhitelist = await walletChecker.check(voteproxy.address)
    console.log('is whitelist? ' + isWhitelist)

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
    console.log('kgl to deposit: ' + startingkgl)

    //deposit kgl and stake
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
    await muKgl.totalSupply().then((a) => console.log('muKgl supply: ' + a))
    await kgl
      .balanceOf(kglDeposit.address)
      .then((a) => console.log('depositor kgl(>0): ' + a))
    await kgl
      .balanceOf(voteproxy.address)
      .then((a) => console.log('proxy kgl(==0): ' + a))
    await vekgl
      .balanceOf(voteproxy.address)
      .then((a) => console.log('proxy veKgl(==0): ' + a))
    console.log('staking kgl')
    await muKgl.approve(muKglRewardsContract.address, 0, { from: userA })
    await muKgl.approve(muKglRewardsContract.address, startingkgl, {
      from: userA,
    })
    await muKglRewardsContract.stakeAll({ from: userA })
    console.log('staked')
    await muKgl
      .balanceOf(userA)
      .then((a) => console.log('muKgl on wallet: ' + a))
    await muKglRewardsContract
      .balanceOf(userA)
      .then((a) => console.log('muKgl staked: ' + a))

    //voting
    console.log('fee claiming...')

    //claim fees
    await booster.earmarkFees({ from: caller })
    console.log('fees earmarked')

    //reward contract balance (should be 0 still)
    await threekgl
      .balanceOf(vekglRewardsContract.address)
      .then((a) => console.log('vekglRewardsContract balance: ' + a))

    //move forward about 2 weeks
    await time.increase(86400 * 15)
    await time.advanceBlock()
    console.log('advance time...')

    /// ----- burn fees to vekgl claim contracts (kagla dao side) ----
    let burnerBalance = await threekgl.balanceOf(
      '0xA464e6DCda8AC41e03616F95f4BC98a13b8922Dc',
    )
    console.log('3kgl on burner: ' + burnerBalance)

    await dai
      .balanceOf(burner.address)
      .then((a) => console.log('burner dai: ' + a))
    //withdraw 3kgl fees
    await burner.withdraw_admin_fees(
      '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7',
    )
    console.log('admin fees withdrawn from pool')
    await dai
      .balanceOf(burner.address)
      .then((a) => console.log('burner dai: ' + a))
    await dai
      .balanceOf(underlyingburner.address)
      .then((a) => console.log('dai on underlyingburner: ' + a))

    //burn dai/usdt/usdc
    await burner.burn(dai.address)
    await burner.burn('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48')
    await burner.burn('0xdAC17F958D2ee523a2206206994597C13D831ec7')
    console.log('burnt single coins')

    await dai
      .balanceOf(burner.address)
      .then((a) => console.log('burner dai: ' + a))
    await dai
      .balanceOf(underlyingburner.address)
      .then((a) => console.log('dai on underlyingburner: ' + a))

    //execute to wrap everything to 3kgl then send to "receiver" at 0xa464
    await underlyingburner.execute()
    console.log('burner executed')

    //should be zero now that its transfered
    await dai
      .balanceOf(burner.address)
      .then((a) => console.log('burner dai: ' + a))
    await dai
      .balanceOf(underlyingburner.address)
      .then((a) => console.log('dai on underlyingburner: ' + a))
    //burn 3kgl
    await burner.burn(threekgl.address)
    console.log('burn complete, checkpoit 3kgl')

    let burnerBalance2 = await threekgl.balanceOf(
      '0xA464e6DCda8AC41e03616F95f4BC98a13b8922Dc',
    )
    console.log('3kgl on burner: ' + burnerBalance2)

    /// ----- burn to vekgl claim contract complete ----

    //claim fees for muuu platform
    await booster.earmarkFees()
    console.log('fees earmarked')

    //balance check (should be all in vekgl reward contract)
    await threekgl
      .balanceOf(vekglRewardsContract.address)
      .then((a) => console.log('vekglRewardsContract balance: ' + a))
    await threekgl
      .balanceOf(voteproxy.address)
      .then((a) => console.log('voteproxy balance(==0): ' + a))
    await threekgl
      .balanceOf(booster.address)
      .then((a) => console.log('booster balance(==0): ' + a))

    //check earned
    await vekglRewardsContract
      .earned(userA)
      .then((a) => console.log('earned fees: ' + a))

    //increase time
    await time.increase(86400)
    await time.advanceBlock()
    console.log('advance time...')
    //check earned
    await vekglRewardsContract
      .earned(userA)
      .then((a) => console.log('earned fees: ' + a))
    //increase time
    await time.increase(86400)
    await time.advanceBlock()
    console.log('advance time...')

    //check earned
    await vekglRewardsContract
      .earned(userA)
      .then((a) => console.log('earned fees: ' + a))

    //before balance
    await threekgl
      .balanceOf(userA)
      .then((a) => console.log('3kgl before claim: ' + a))
    //get reward from main contract which will also claim from children contracts(kgl is main, vekgl fees is child)
    await muKglRewardsContract.getReward({ from: userA })
    await threekgl
      .balanceOf(userA)
      .then((a) => console.log('3kgl after claim: ' + a))
  })
})
