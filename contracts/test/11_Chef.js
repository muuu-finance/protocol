// const { BN, constants, expectEvent, expectRevert, time } = require('@openzeppelin/test-helpers');
const { BN, time } = require('@openzeppelin/test-helpers')
var jsonfile = require('jsonfile')
var contractList = jsonfile.readFileSync('./contracts.json')

const Booster = artifacts.require('Booster')
const KglDepositor = artifacts.require('KglDepositor')
const KaglaVoterProxy = artifacts.require('KaglaVoterProxy')
const ExtraRewardStashV1 = artifacts.require('ExtraRewardStashV1')
const ExtraRewardStashV2 = artifacts.require('ExtraRewardStashV2')
const BaseRewardPool = artifacts.require('BaseRewardPool')
const VirtualBalanceRewardPool = artifacts.require('VirtualBalanceRewardPool')
const muuuRewardPool = artifacts.require('MuuuRewardPool')
const MuuuToken = artifacts.require('MuuuToken')
const muKglToken = artifacts.require('MuKglToken')
const StashFactory = artifacts.require('StashFactory')
const RewardFactory = artifacts.require('RewardFactory')
const ArbitratorVault = artifacts.require('ArbitratorVault')
const PoolManager = artifacts.require('PoolManager')
const MuuuMasterChef = artifacts.require('MuuuMasterChef')
const ChefExtraRewards = artifacts.require('ChefExtraRewards')

const IERC20 = artifacts.require('IERC20')

//3. extra rewards, but with v1 gauges

contract('Test masterchef rewards', async (accounts) => {
  it('should deposit lp tokens and earn muuu', async () => {
    let weth = await IERC20.at('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2')

    let admin = accounts[0]
    let userA = accounts[1]
    let userB = accounts[2]
    let caller = accounts[3]

    //system
    let voteproxy = await KaglaVoterProxy.at(contractList.system.voteProxy)
    let booster = await Booster.deployed()
    let rewardFactory = await RewardFactory.deployed()
    let stashFactory = await StashFactory.deployed()
    let poolManager = await PoolManager.deployed()
    let chef = await MuuuMasterChef.deployed()
    let muuu = await MuuuToken.deployed()
    let muKgl = await muKglToken.deployed()
    let kglDeposit = await KglDepositor.deployed()
    let muKglRewards = await booster.lockRewards()
    let muuuRewards = await booster.stakerRewards()
    let muKglRewardsContract = await BaseRewardPool.at(muKglRewards)
    let muuuRewardsContract = await muuuRewardPool.at(muuuRewards)

    let muuuLP = await IERC20.at(contractList.system.muuuEthSLP)
    let muKglLP = await IERC20.at(contractList.system.muKglKglSLP)

    //give to different accounts
    var muuulpBal = await muuuLP.balanceOf(admin)
    await muuuLP.transfer(userA, muuulpBal)
    var muKgllpBal = await muKglLP.balanceOf(admin)
    await muKglLP.transfer(userB, muKgllpBal)

    //add extra rewards
    await weth.sendTransaction({ value: web3.utils.toWei('5.0', 'ether') })

    let extraRewards = await ChefExtraRewards.new(chef.address, weth.address)
    await weth.transfer(extraRewards.address, web3.utils.toWei('5.0', 'ether'))
    await chef.set(0, 10000, extraRewards.address, true, true)

    await muuuLP.approve(chef.address, muuulpBal, { from: userA })
    await muKglLP.approve(chef.address, muKgllpBal, { from: userB })

    await chef.deposit(1, muuulpBal, { from: userA })
    await chef.deposit(0, muKgllpBal, { from: userB })

    await chef
      .userInfo(1, userA)
      .then((a) => console.log('user a muuueth: ' + JSON.stringify(a)))
    await chef
      .userInfo(0, userB)
      .then((a) => console.log('user b mukglkglv: ' + JSON.stringify(a)))
    await time.increase(60)
    await time.advanceBlock()
    await chef
      .pendingMuuu(1, userA)
      .then((a) => console.log('user a pending: ' + a))
    await chef
      .pendingMuuu(0, userB)
      .then((a) => console.log('user b pending: ' + a))

    //advance time
    await time.increase(86400)
    await time.advanceBlock()
    await time.advanceBlock()
    await time.advanceBlock()
    console.log('advance time...')

    await chef
      .pendingMuuu(1, userA)
      .then((a) => console.log('user a pending: ' + a))
    await chef
      .pendingMuuu(0, userB)
      .then((a) => console.log('user b pending: ' + a))

    //advance time
    await time.increase(86400)
    await time.advanceBlock()
    await time.advanceBlock()
    await time.advanceBlock()
    console.log('advance time...')

    await chef
      .pendingMuuu(1, userA)
      .then((a) => console.log('user a pending: ' + a))
    await chef
      .pendingMuuu(0, userB)
      .then((a) => console.log('user b pending: ' + a))

    //advance time
    await time.increase(86400)
    await time.advanceBlock()
    await time.advanceBlock()
    await time.advanceBlock()
    console.log('advance time...')

    await chef
      .pendingMuuu(1, userA)
      .then((a) => console.log('user a pending: ' + a))
    await chef
      .pendingMuuu(0, userB)
      .then((a) => console.log('user b pending: ' + a))

    await chef.claim(1, userA)
    await chef.withdraw(0, muKgllpBal, { from: userB })
    await chef
      .pendingMuuu(1, userA)
      .then((a) => console.log('user a pending: ' + a))
    await chef
      .pendingMuuu(0, userB)
      .then((a) => console.log('user b pending: ' + a))
    await chef
      .userInfo(1, userA)
      .then((a) => console.log('user a muuueth: ' + JSON.stringify(a)))
    await chef
      .userInfo(0, userB)
      .then((a) => console.log('user b mukglkglv: ' + JSON.stringify(a)))

    await muuuLP
      .balanceOf(userA)
      .then((a) => console.log('user a lp on wallet: ' + a))
    await muKglLP
      .balanceOf(userB)
      .then((a) => console.log('user b lp on wallet: ' + a))
    await muuu
      .balanceOf(userA)
      .then((a) => console.log('user a muuu on wallet: ' + a))
    await muuu
      .balanceOf(userB)
      .then((a) => console.log('user b muuu on wallet: ' + a))
    await weth
      .balanceOf(userA)
      .then((a) => console.log('user a weth on wallet: ' + a))
    await weth
      .balanceOf(userB)
      .then((a) => console.log('user b weth on wallet: ' + a))
  })
})
