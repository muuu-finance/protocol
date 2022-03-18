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
const muKglToken = artifacts.require('muKglToken')
const StashFactory = artifacts.require('StashFactory')
const RewardFactory = artifacts.require('RewardFactory')

const IExchange = artifacts.require('IExchange')
const IKaglaFi = artifacts.require('I3KaglaFi')
const IERC20 = artifacts.require('IERC20')
const IVoting = artifacts.require('IVoting')
const IVoteStarter = artifacts.require('IVoteStarter')
const IWalletCheckerDebug = artifacts.require('IWalletCheckerDebug')
const IEscro = artifacts.require('IEscro')

contract('Whitelist Test', async (accounts) => {
  it('should add to whitelist and test locking', async () => {
    let account = accounts[0]
    let kgl = await IERC20.at('0xD533a949740bb3306d119CC777fa900bA034cd52')
    let threeKgl = await IERC20.at('0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490')
    let weth = await IERC20.at('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2')
    let vekgl = await IERC20.at('0x5f3b5DfEb7B28CDbD7FAba78963EE202a494e2A2')
    let exchange = await IExchange.at(
      '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    )
    let walletChecker = await IWalletCheckerDebug.at(
      '0xca719728Ef172d0961768581fdF35CB116e0B7a4',
    )
    let escrow = await IEscro.at('0x5f3b5DfEb7B28CDbD7FAba78963EE202a494e2A2')
    let checkerAdmin = '0x40907540d8a6C65c637785e8f8B742ae6b0b9968'

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

    let starttime = await time.latest()
    console.log('current block time: ' + starttime)
    await time.latestBlock().then((a) => console.log('current block: ' + a))

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

    //check balances, kgl should still be on depositor
    await kgl.balanceOf(userA).then((a) => console.log('kgl on wallet: ' + a))
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

    //try burning from muKgl to reclaim kgl (only doable before lock made)
    console.log('try burn 100 muKgl')
    await kglDeposit.burn(100, { from: userA })
    await kgl.balanceOf(userA).then((a) => console.log('kgl on wallet: ' + a))
    await muKgl
      .balanceOf(userA)
      .then((a) => console.log('muKgl on wallet: ' + a))
    await muKgl.totalSupply().then((a) => console.log('muKgl supply: ' + a))

    //add to whitelist
    await walletChecker.approveWallet(voteproxy.address, {
      from: checkerAdmin,
      gasPrice: 0,
    })
    console.log('approve wallet')
    let isWhitelist = await walletChecker.check(voteproxy.address)
    console.log('is whitelist? ' + isWhitelist)

    //get more kgl
    await weth.sendTransaction({
      value: web3.utils.toWei('1.0', 'ether'),
      from: userA,
    })
    let wethForKgl2 = await weth.balanceOf(userA)
    await weth.approve(exchange.address, 0, { from: userA })
    await weth.approve(exchange.address, wethForKgl2, { from: userA })
    await exchange.swapExactTokensForTokens(
      wethForKgl2,
      0,
      [weth.address, kgl.address],
      userA,
      starttime + 3000,
      { from: userA },
    )
    var kglBal = await kgl.balanceOf(userA)
    console.log('kgl to deposit(2): ' + kglBal)

    //split into 3 deposits
    // 1: initial lock
    // 2: within 2 weeks (triggers only amount increase)
    // 3: after 2 weeks (triggers amount+time increase)

    //deposit kgl (after whitelist)
    await kgl.approve(kglDeposit.address, 0, { from: userA })
    await kgl.approve(kglDeposit.address, kglBal, { from: userA })
    await kglDeposit.deposit(
      1,
      true,
      '0x0000000000000000000000000000000000000000',
      {
        from: userA,
      },
    )
    console.log('kgl deposited (initial lock)')

    //check balances, kgl should have moved to proxy and vekgl should be >0
    await muKgl
      .balanceOf(userA)
      .then((a) => console.log('muKgl on wallet: ' + a))
    await muKgl.totalSupply().then((a) => console.log('muKgl supply: ' + a))
    await kgl
      .balanceOf(kglDeposit.address)
      .then((a) => console.log('depositor kgl(==0): ' + a))
    await kgl
      .balanceOf(voteproxy.address)
      .then((a) => console.log('proxy kgl(==0): ' + a))
    await vekgl
      .balanceOf(voteproxy.address)
      .then((a) => console.log('proxy veKgl(>0): ' + a))
    await escrow
      .locked__end(voteproxy.address)
      .then((a) => console.log('proxy unlock date: ' + a))

    //try burning again after lock, which will fail
    await kgl.balanceOf(userA).then((a) => console.log('kgl on wallet: ' + a))
    await muKgl
      .balanceOf(userA)
      .then((a) => console.log('muKgl on wallet: ' + a))
    await muKgl.totalSupply().then((a) => console.log('muKgl supply: ' + a))
    console.log('try burn 100 muKgl after whitelist(should catch error)')
    await kglDeposit
      .burn(100, { from: userA })
      .catch((a) => console.log('--> burn reverted'))

    await kgl.balanceOf(userA).then((a) => console.log('kgl on wallet: ' + a))
    await muKgl
      .balanceOf(userA)
      .then((a) => console.log('muKgl on wallet: ' + a))
    await muKgl.totalSupply().then((a) => console.log('muKgl supply: ' + a))

    //increase time a bit
    await time.increase(86400)
    await time.advanceBlock()
    console.log('advance time....')

    //deposit more kgl, this should trigger a amount increase only
    // vekgl should go up, unlock date should stay the same
    await vekgl
      .balanceOf(voteproxy.address)
      .then((a) => console.log('proxy veKgl(>0): ' + a))
    await kglDeposit.deposit(
      12345678900,
      true,
      '0x0000000000000000000000000000000000000000',
      {
        from: userA,
      },
    )
    console.log('kgl deposited (amount increase only)')
    await muKgl
      .balanceOf(userA)
      .then((a) => console.log('muKgl on wallet: ' + a))
    await muKgl.totalSupply().then((a) => console.log('muKgl supply: ' + a))
    await kgl
      .balanceOf(kglDeposit.address)
      .then((a) => console.log('depositor kgl(==0): ' + a))
    await kgl
      .balanceOf(voteproxy.address)
      .then((a) => console.log('proxy kgl(==0): ' + a))
    await vekgl
      .balanceOf(voteproxy.address)
      .then((a) => console.log('proxy veKgl(>0): ' + a))
    await escrow
      .locked__end(voteproxy.address)
      .then((a) => console.log('proxy unlock date: ' + a))

    //increase by more than 2 weeks
    await time.increase(15 * 86400)
    await time.advanceBlock()
    console.log('advance time....')

    //deposit rest of kgl
    //vekgl AND unlock date should increase
    kglBal = await kgl.balanceOf(userA)
    await kglDeposit.deposit(
      kglBal,
      true,
      '0x0000000000000000000000000000000000000000',
      {
        from: userA,
      },
    )
    console.log('kgl deposited (amount+time increase)')
    await muKgl
      .balanceOf(userA)
      .then((a) => console.log('muKgl on wallet: ' + a))
    await muKgl.totalSupply().then((a) => console.log('muKgl supply: ' + a))
    await kgl
      .balanceOf(kglDeposit.address)
      .then((a) => console.log('depositor kgl(==0): ' + a))
    await kgl
      .balanceOf(voteproxy.address)
      .then((a) => console.log('proxy kgl(==0): ' + a))
    await vekgl
      .balanceOf(voteproxy.address)
      .then((a) => console.log('proxy veKgl(>0): ' + a))
    await escrow
      .locked__end(voteproxy.address)
      .then((a) => console.log('proxy unlock date: ' + a))

    //advance time by 1.5 months
    await time.increase(45 * 86400)
    await time.advanceBlock()
    await time.advanceBlock()
    await time.advanceBlock()
    await time.advanceBlock()
    await time.advanceBlock()
    console.log('advance time....')

    await vekgl
      .balanceOf(voteproxy.address)
      .then((a) => console.log('proxy veKgl(>0): ' + a))

    //get more kgl
    await weth.sendTransaction({
      value: web3.utils.toWei('1.0', 'ether'),
      from: userA,
    })
    let wethForKgl3 = await weth.balanceOf(userA)
    await weth.approve(exchange.address, 0, { from: userA })
    await weth.approve(exchange.address, wethForKgl3, { from: userA })
    await exchange.swapExactTokensForTokens(
      wethForKgl3,
      0,
      [weth.address, kgl.address],
      userA,
      starttime + 3000,
      { from: userA },
    )
    kglBal = await kgl.balanceOf(userA)
    console.log('kgl to deposit(3): ' + kglBal)

    //deposit kgl (after whitelist) without locking immediately
    await kgl.approve(kglDeposit.address, 0, { from: userA })
    await kgl.approve(kglDeposit.address, kglBal, { from: userA })
    await kglDeposit.deposit(
      kglBal,
      false,
      '0x0000000000000000000000000000000000000000',
      {
        from: userA,
      },
    )
    console.log('kgl deposited but not locked')
    await muKgl
      .balanceOf(userA)
      .then((a) => console.log('muKgl on wallet: ' + a))
    await muKgl.totalSupply().then((a) => console.log('muKgl supply: ' + a))
    await kgl
      .balanceOf(kglDeposit.address)
      .then((a) => console.log('depositor kgl(==0): ' + a))
    await kgl
      .balanceOf(voteproxy.address)
      .then((a) => console.log('proxy kgl(==0): ' + a))
    await vekgl
      .balanceOf(voteproxy.address)
      .then((a) => console.log('proxy veKgl: ' + a))

    //NOTE: when testing for release and re creation of lock
    //this function timeouts in infura when trying to process 4 years.
    //to test release/createlock, the contract needs to be modified to only lock a month or so

    //lock deposited kgl, caller should get a bit of muKgl for compensation
    await kglDeposit.lockKagla({ from: caller })
    console.log('kgl locked')
    await muKgl
      .balanceOf(userA)
      .then((a) => console.log('muKgl on wallet: ' + a))
    await muKgl
      .balanceOf(caller)
      .then((a) => console.log('muKgl on caller: ' + a))
    await muKgl.totalSupply().then((a) => console.log('muKgl supply: ' + a))
    await kgl
      .balanceOf(kglDeposit.address)
      .then((a) => console.log('depositor kgl(==0): ' + a))
    await kgl
      .balanceOf(voteproxy.address)
      .then((a) => console.log('proxy kgl(==0): ' + a))
    await vekgl
      .balanceOf(voteproxy.address)
      .then((a) => console.log('proxy veKgl(>0): ' + a))
  })
})
