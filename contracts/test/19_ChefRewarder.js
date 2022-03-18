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
const muKglToken = artifacts.require('muKglToken')
const StashFactory = artifacts.require('StashFactory')
const RewardFactory = artifacts.require('RewardFactory')
const ArbitratorVault = artifacts.require('ArbitratorVault')
const PoolManager = artifacts.require('PoolManager')
const MuuuMasterChef = artifacts.require('MuuuMasterChef')
const ChefToken = artifacts.require('ChefToken')
const ChefExtraRewards = artifacts.require('ChefExtraRewards')
const SushiChefV2 = artifacts.require('SushiChefV2')
const SushiChefV1 = artifacts.require('SushiChefV1')
const MuuuRewarder = artifacts.require('MuuuRewarder')
const IExchange = artifacts.require('IExchange')
const IUniswapV2Router01 = artifacts.require('IUniswapV2Router01')
const TreasuryFunds = artifacts.require('TreasuryFunds')

const IERC20 = artifacts.require('IERC20')

contract('Test masterchef rewards', async (accounts) => {
  it('should deposit lp tokens and earn muuu', async () => {
    let deployer = '0x947B7742C403f20e5FaCcDAc5E092C943E7D0277'
    let multisig = '0xa3C5A1e09150B75ff251c1a7815A07182c3de2FB'
    let addressZero = '0x0000000000000000000000000000000000000000'

    //system
    let booster = await Booster.at(contractList.system.booster)
    let voteproxy = await KaglaVoterProxy.at(contractList.system.voteProxy)
    let chef = await MuuuMasterChef.at(contractList.system.chef)
    let muuu = await MuuuToken.at(contractList.system.muuu)
    let muuuLP = await IERC20.at(contractList.system.muuuEthSLP)
    let muKgl = await muKglToken.at(contractList.system.muKgl)
    let muKglLP = await IERC20.at(contractList.system.muKglKglSLP)
    let exchange = await IExchange.at(
      '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
    )
    let exchangerouter = await IUniswapV2Router01.at(
      '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
    )
    let weth = await IERC20.at('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2')
    let sushiChef = await SushiChefV2.at(
      '0xEF0881eC094552b2e128Cf945EF17a6752B4Ec5d',
    )
    let sushiAdmin = '0x19B3Eb3Af5D93b77a5619b047De0EED7115A19e7'
    let oldchef = await SushiChefV1.at(
      '0xc2EdaD668740f1aA35E4D8f227fB8E17dcA888Cd',
    )
    let oldchefPid = 250
    let oldchefAdmin = '0x9a8541Ddf3a932a9A922B607e9CF7301f1d47bD1'
    let sushi = await IERC20.at('0x6B3595068778DD592e39A122f4f5a5cF09C90fE2')

    // let dummyMuuu = await ChefToken.at(contractList.system.chefMuuuToken);
    // console.log("dummyMuuu: " +dummyMuuu.address);
    // let dummyMuKgl = await ChefToken.at(contractList.system.chefmuKglToken);
    // console.log("dummyMuKgl: " +dummyMuKgl.address);

    let rewardermuuu = await MuuuRewarder.at(
      contractList.system.muuuEthRewarder,
    )
    let rewardermukgl = await MuuuRewarder.at(
      contractList.system.muKglKglRewarder,
    )

    let dummyMuuu = await ChefToken.at(contractList.system.chefMuuuToken)
    console.log('dummyMuuu: ' + dummyMuuu.address)
    let dummyMuKgl = await ChefToken.at(contractList.system.chefmuKglToken)
    console.log('dummyMuKgl: ' + dummyMuKgl.address)
    //call init(dummy.address)
    var dummybal = await dummyMuuu.balanceOf(deployer)
    await dummyMuuu.approve(rewardermuuu.address, dummybal, { from: deployer })
    console.log('approve dummyMuuu for ' + dummybal)
    var dummybal = await dummyMuKgl.balanceOf(deployer)
    await dummyMuKgl.approve(rewardermukgl.address, dummybal, {
      from: deployer,
    })
    console.log('approve dummyMuuu for ' + dummybal)

    // var muuubalance = await muuu.balanceOf(deployer);
    // muuubalance = muuubalance.div(new BN("2"));
    var mukglAmount = '54000000000000000000000'
    var muuuAmount = '36000000000000000000000'
    await muuu.transfer(rewardermuuu.address, muuuAmount, { from: deployer })
    await muuu.transfer(rewardermukgl.address, mukglAmount, { from: deployer })
    await muuu
      .balanceOf(deployer)
      .then((a) => console.log('balance on deployer:' + a))
    await muuu
      .balanceOf(rewardermuuu.address)
      .then((a) => console.log('balance on rewardermuuu:' + a))
    await muuu
      .balanceOf(rewardermukgl.address)
      .then((a) => console.log('balance on rewardermukgl:' + a))
    // console.log("send muuu to rewardermuuu: " +muuubalance)
    await rewardermuuu.init(dummyMuuu.address, { from: deployer })
    console.log('init rewardermuuu')
    await rewardermukgl.init(dummyMuKgl.address, { from: deployer })
    console.log('init rewardermukgl')

    // return;

    //set points from v1 to v2
    await oldchef.set(oldchefPid, 50000, false, {
      from: oldchefAdmin,
      gasPrice: 0,
    })
    console.log('allocated points to v2')

    await sushiChef.harvestFromMasterChef({ from: sushiAdmin })
    await time.increase(86400)
    await time.advanceBlock()
    console.log('advance time...')
    await sushiChef.harvestFromMasterChef({ from: sushiAdmin })
    await sushi.balanceOf(sushiChef.address).then((a) => console.log('' + a))

    let starttime = await time.latest()
    await weth.sendTransaction({
      value: web3.utils.toWei('10.0', 'ether'),
      from: deployer,
    })
    var wethBalance = await weth.balanceOf(deployer)
    console.log('receive weth: ' + wethBalance)
    await weth.approve(exchange.address, wethBalance, { from: deployer })
    await exchange.swapExactTokensForTokens(
      web3.utils.toWei('1.0', 'ether'),
      0,
      [weth.address, muuu.address],
      deployer,
      starttime + 3000,
      { from: deployer },
    )
    var muuubalance = await muuu.balanceOf(deployer)
    console.log('swapped for muuu: ' + muuubalance)
    wethBalance = await weth.balanceOf(deployer)
    console.log('weth remainig: ' + wethBalance)
    //trade for a bunch of muuu
    //add to slp using a portion
    await muuu.approve(exchange.address, muuubalance, { from: deployer })
    await exchangerouter.addLiquidity(
      weth.address,
      muuu.address,
      wethBalance,
      muuubalance,
      0,
      0,
      deployer,
      starttime + 3000,
      { from: deployer },
    )
    var lpbalance = await muuuLP.balanceOf(deployer)
    console.log('lpbalance: ' + lpbalance)

    //get more muuu
    // await exchange.swapExactTokensForTokens(web3.utils.toWei("6.0", "ether"),0,[weth.address,muuu.address],deployer,starttime+3000,{from:deployer});
    // muuubalance = await muuu.balanceOf(deployer);
    // console.log("muuu for init: " +muuubalance);

    //add to sushi chef pool
    await sushiChef.set(1, 10000, rewardermuuu.address, false, {
      from: sushiAdmin,
      gasPrice: 0,
    })
    // console.log("added slot to sushi chef");

    await sushiChef
      .rewarder(1)
      .then((a) => console.log('rewarded on sushi pool: ' + a))

    //stake on sushi
    await muuuLP.approve(sushiChef.address, lpbalance, { from: deployer })
    await sushiChef.deposit(1, lpbalance, deployer, { from: deployer })
    var userinfo = await sushiChef.userInfo(1, deployer)
    console.log('user info: ' + JSON.stringify(userinfo))

    for (var i = 0; i < 3; i++) {
      //check info
      console.log('prerewards cycle: ' + i)
      await sushiChef
        .pendingSushi(1, deployer)
        .then((a) => console.log('pending sushi: ' + a))
      await rewardermuuu
        .periodFinish()
        .then((a) => console.log('periodFinish: ' + a))
      await rewardermuuu
        .rewardRate()
        .then((a) => console.log('rewardRate: ' + a))
      await rewardermuuu
        .previousRewardDebt()
        .then((a) => console.log('previousRewardDebt: ' + a))
      await rewardermuuu
        .earned(deployer)
        .then((a) => console.log('muuu earned: ' + a))
      await muuu
        .balanceOf(deployer)
        .then((a) => console.log('muuu wallet: ' + a))
      console.log('--> harvest')
      var callA = sushiChef.contract.methods.harvestFromMasterChef().encodeABI()
      var callB = sushiChef.contract.methods.harvest(1, deployer).encodeABI()
      await sushiChef.batch([callA, callB], { from: deployer })
      //await sushiChef.harvest(1,deployer,{from:deployer});
      await sushiChef
        .pendingSushi(1, deployer)
        .then((a) => console.log('pending sushi after harvest: ' + a))
      await sushi
        .balanceOf(deployer)
        .then((a) => console.log('sushi wallet after claim: ' + a))
      await muuu
        .balanceOf(deployer)
        .then((a) => console.log('muuu wallet after claim: ' + a))
      await muuu
        .balanceOf(rewardermuuu.address)
        .then((a) => console.log('muuu left on rewardermuuu: ' + a))
      console.log('----------------------')
      await time.increase(86400)
      await time.advanceBlock()
      console.log('advance time...')
    }

    await chef.set(0, 0, addressZero, false, false, {
      from: multisig,
      gasPrice: 0,
    })
    await chef.set(1, 0, addressZero, false, false, {
      from: multisig,
      gasPrice: 0,
    })
    await chef.set(2, 8000, addressZero, false, false, {
      from: multisig,
      gasPrice: 0,
    })
    await chef.set(3, 12000, addressZero, true, false, {
      from: multisig,
      gasPrice: 0,
    })

    //call init(dummy.address)
    // var dummybal = await dummyMuuu.balanceOf(deployer);
    // await dummyMuuu.approve(rewardermuuu.address,dummybal,{from:deployer});
    // console.log("approve dummy for " +dummybal);
    // var muuubalance = await muuu.balanceOf(deployer);
    // await muuu.transfer(rewardermuuu.address,muuubalance,{from:deployer})
    // console.log("send muuu to rewardermuuu: " +muuubalance)
    // await rewardermuuu.init(dummyMuuu.address,{from:deployer});
    // console.log("init rewardermuuu");

    for (var i = 0; i < 100; i++) {
      //check info
      console.log('cycle: ' + i)
      await sushiChef
        .pendingSushi(1, deployer)
        .then((a) => console.log('pending sushi: ' + a))
      var pendingTokens = await rewardermuuu.pendingTokens(0, deployer, 0)
      console.log('pendingTokens: ' + JSON.stringify(pendingTokens))
      await rewardermuuu
        .periodFinish()
        .then((a) => console.log('periodFinish: ' + a))
      await rewardermuuu
        .rewardRate()
        .then((a) => console.log('rewardRate: ' + a))
      await rewardermuuu
        .previousRewardDebt()
        .then((a) => console.log('previousRewardDebt: ' + a))
      await rewardermuuu
        .earned(deployer)
        .then((a) => console.log('muuu earned: ' + a))
      await muuu
        .balanceOf(deployer)
        .then((a) => console.log('muuu wallet: ' + a))
      console.log('--> harvest')
      await sushiChef.harvest(1, deployer, { from: deployer })
      await sushiChef
        .pendingSushi(1, deployer)
        .then((a) => console.log('pending sushi after harvest: ' + a))
      await sushi
        .balanceOf(deployer)
        .then((a) => console.log('sushi wallet after claim: ' + a))
      await muuu
        .balanceOf(deployer)
        .then((a) => console.log('muuu wallet after claim: ' + a))
      await muuu
        .balanceOf(rewardermuuu.address)
        .then((a) => console.log('muuu left on rewardermuuu: ' + a))
      console.log('----------------------')
      await time.increase(86400)
      await time.advanceBlock()
      console.log('advance time...')
    }

    console.log('--withdraw--')
    await sushiChef.withdrawAndHarvest(1, lpbalance, deployer, {
      from: deployer,
    })
    await sushiChef
      .pendingSushi(1, deployer)
      .then((a) => console.log('pending sushi after harvest: ' + a))
    await sushi
      .balanceOf(deployer)
      .then((a) => console.log('sushi wallet after claim: ' + a))
    await muuu
      .balanceOf(deployer)
      .then((a) => console.log('muuu wallet after claim: ' + a))
    await muuu
      .balanceOf(rewardermuuu.address)
      .then((a) => console.log('muuu left on rewardermuuu: ' + a))
  })
})
