// const { BN, constants, expectEvent, expectRevert, time } = require('@openzeppelin/test-helpers');
const { BN, time } = require('@openzeppelin/test-helpers');
var jsonfile = require('jsonfile');
var contractList = jsonfile.readFileSync('./contracts.json');

const Booster = artifacts.require('Booster');
const KglDepositor = artifacts.require('KglDepositor');
const KaglaVoterProxy = artifacts.require('KaglaVoterProxy');
const ExtraRewardStashV1 = artifacts.require('ExtraRewardStashV1');
const ExtraRewardStashV2 = artifacts.require('ExtraRewardStashV2');
const BaseRewardPool = artifacts.require('BaseRewardPool');
const VirtualBalanceRewardPool = artifacts.require('VirtualBalanceRewardPool');
const muuuRewardPool = artifacts.require('muuuRewardPool');
const MuuuToken = artifacts.require('MuuuToken');
const muKglToken = artifacts.require('muKglToken');
const StashFactory = artifacts.require('StashFactory');
const RewardFactory = artifacts.require('RewardFactory');
const ArbitratorVault = artifacts.require('ArbitratorVault');
const PoolManager = artifacts.require('PoolManager');
const MuuuMasterChef = artifacts.require('MuuuMasterChef');
const ChefToken = artifacts.require('ChefToken');
const ChefExtraRewards = artifacts.require('ChefExtraRewards');
const SushiChefV2 = artifacts.require('SushiChefV2');
const SushiChefV1 = artifacts.require('SushiChefV1');
const MuuuRewarder = artifacts.require('MuuuRewarder');
const IExchange = artifacts.require('IExchange');
const IUniswapV2Router01 = artifacts.require('IUniswapV2Router01');

const IERC20 = artifacts.require('IERC20');

//3. extra rewards, but with v1 gauges

contract('Test masterchef rewards setup', async (accounts) => {
  it('should setup master chefs and add liq to slps', async () => {
    let deployer = '0x947B7742C403f20e5FaCcDAc5E092C943E7D0277';
    let multisig = '0xa3C5A1e09150B75ff251c1a7815A07182c3de2FB';
    let addressZero = '0x0000000000000000000000000000000000000000';

    //system
    let booster = await Booster.at(contractList.system.booster);
    let voteproxy = await KaglaVoterProxy.at(contractList.system.voteProxy);
    let chef = await MuuuMasterChef.at(contractList.system.chef);
    let muuu = await MuuuToken.at(contractList.system.muuu);
    let muKgl = await muKglToken.at(contractList.system.muKgl);
    let muuuLP = await IERC20.at(contractList.system.muuuEthSLP);
    let muKglLP = await IERC20.at(contractList.system.muKglKglSLP);
    let kglDeposit = await KglDepositor.at(contractList.system.kglDepositor);
    let kgl = await IERC20.at('0xD533a949740bb3306d119CC777fa900bA034cd52');
    let exchange = await IExchange.at('0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F');
    let exchangerouter = await IUniswapV2Router01.at('0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F');
    let weth = await IERC20.at('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2');
    let sushiChef = await SushiChefV2.at('0xEF0881eC094552b2e128Cf945EF17a6752B4Ec5d');
    let sushiAdmin = '0x19B3Eb3Af5D93b77a5619b047De0EED7115A19e7';
    let oldchef = await SushiChefV1.at('0xc2EdaD668740f1aA35E4D8f227fB8E17dcA888Cd');
    let oldchefPid = 250;
    let oldchefAdmin = '0x9a8541Ddf3a932a9A922B607e9CF7301f1d47bD1';
    let sushi = await IERC20.at('0x6B3595068778DD592e39A122f4f5a5cF09C90fE2');

    let dummyMuuu = await ChefToken.at(contractList.system.chefMuuuToken);
    console.log('dummyMuuu: ' + dummyMuuu.address);
    let dummyMuuuKgl = await ChefToken.at(contractList.system.chefmuKglToken);
    console.log('dummyMuuuKgl: ' + dummyMuuuKgl.address);

    //set points from v1 to v2
    await oldchef.set(oldchefPid, 50000, false, { from: oldchefAdmin, gasPrice: 0 });
    console.log('allocated points to v2');

    await sushiChef.harvestFromMasterChef({ from: sushiAdmin });
    await time.increase(86400);
    await time.advanceBlock();
    console.log('advance time...');
    await sushiChef.harvestFromMasterChef({ from: sushiAdmin });
    await sushi.balanceOf(sushiChef.address).then((a) => console.log('' + a));

    let starttime = await time.latest();
    await weth.sendTransaction({ value: web3.utils.toWei('10.0', 'ether'), from: deployer });
    var wethBalance = await weth.balanceOf(deployer);
    console.log('receive weth: ' + wethBalance);
    await weth.approve(exchange.address, wethBalance, { from: deployer });
    //get muuu slp
    await exchange.swapExactTokensForTokens(
      web3.utils.toWei('1.0', 'ether'),
      0,
      [weth.address, muuu.address],
      deployer,
      starttime + 3000,
      { from: deployer }
    );
    var muuubalance = await muuu.balanceOf(deployer);
    console.log('swapped for muuu: ' + muuubalance);
    wethBalance = await weth.balanceOf(deployer);
    console.log('weth remainig: ' + wethBalance);
    //trade for a bunch of muuu
    //add to slp using a portion
    await muuu.approve(exchangerouter.address, muuubalance, { from: deployer });
    await weth.approve(exchangerouter.address, wethBalance, { from: deployer });
    await exchangerouter.addLiquidity(
      weth.address,
      muuu.address,
      web3.utils.toWei('1.0', 'ether'),
      muuubalance,
      0,
      0,
      deployer,
      starttime + 3000,
      { from: deployer }
    );
    var lpbalance = await muuuLP.balanceOf(deployer);
    //  console.log("muuu lpbalance: " +lpbalance);

    //send to test account
    await muuuLP.transfer(accounts[0], lpbalance, { from: deployer });
    await muuuLP.balanceOf(accounts[0]).then((a) => console.log('muuuEth lp balance: ' + a));

    //get mukgl slp
    await exchange.swapExactTokensForTokens(
      web3.utils.toWei('1.0', 'ether'),
      0,
      [weth.address, kgl.address],
      deployer,
      starttime + 3000,
      { from: deployer }
    );
    var kglbalance = await kgl.balanceOf(deployer);
    console.log('swapped for muuu: ' + muuubalance);
    var depositamount = kglbalance.div(new BN('2'));
    await kgl.approve(kglDeposit.address, kglbalance, { from: deployer });
    await kglDeposit.deposit(depositamount, false, addressZero, { from: deployer });
    var mukglBal = await muKgl.balanceOf(deployer);
    kglbalance = await kgl.balanceOf(deployer);
    console.log('mukgl bal: ' + mukglBal);
    console.log('kgl bal: ' + kglbalance);
    await kgl.approve(exchange.address, kglbalance, { from: deployer });
    await muKgl.approve(exchange.address, kglbalance, { from: deployer });
    console.log('approved kgl and mukgl');
    await exchangerouter.addLiquidity(
      kgl.address,
      muKgl.address,
      kglbalance,
      mukglBal,
      0,
      0,
      deployer,
      starttime + 3000,
      { from: deployer }
    );
    var muKgllpbalance = await muKglLP.balanceOf(deployer);
    // console.log("mukgl lpbalance: " +lpbalance);

    //send to test account
    await muKglLP.transfer(accounts[0], muKgllpbalance, { from: deployer });
    await muKglLP.balanceOf(accounts[0]).then((a) => console.log('mukglKgl lp balance: ' + a));

    //get more muuu
    // await exchange.swapExactTokensForTokens(web3.utils.toWei("6.0", "ether"),0,[weth.address,muuu.address],deployer,starttime+3000,{from:deployer});
    muuubalance = await muuu.balanceOf(deployer);
    console.log('muuu for init: ' + muuubalance);

    //add slot slot for dummy token on muuu master chef
    // await chef.add(8000000000,dummyMuuu.address,addressZero,true,{from:multisig,gasPrice:0});
    // console.log("add slot to muuu chef");
    // await chef.add(12000000000,dummyMuuuKgl.address,addressZero,true,{from:multisig,gasPrice:0});
    // console.log("add slot to muuu chef");

    //create rewarder for muuu/eth
    let rewardermuuu = await MuuuRewarder.at(contractList.system.muuuEthRewarder);
    // let rewardermuuu = await MuuuRewarder.new(muuuLP.address,muuu.address,multisig,sushiChef.address,chef.address,2);
    console.log('created muuueth rewarder at ' + rewardermuuu.address);

    let rewardermukgl = await MuuuRewarder.at(contractList.system.muKglKglRewarder);
    //let rewardermukgl = await MuuuRewarder.new(muKglLP.address,muuu.address,multisig,sushiChef.address,chef.address,3);
    console.log('created mukglkgl rewarder at ' + rewardermukgl.address);

    //add to sushi chef pool
    //await sushiChef.add(10000,muuuLP.address,rewardermuuu.address,{from:sushiAdmin,gasPrice:0});
    await sushiChef.set(1, 10000, rewardermuuu.address, false, { from: sushiAdmin, gasPrice: 0 });
    console.log('added slot to sushi chef');
    //await sushiChef.add(10000,muKglLP.address,rewardermukgl.address,{from:sushiAdmin,gasPrice:0});
    await sushiChef.set(2, 10000, rewardermukgl.address, false, {
      from: sushiAdmin,
      gasPrice: 0,
    });
    console.log('added slot to sushi chef');

    await sushiChef.rewarder(1).then((a) => console.log('rewarder 1 on sushi pool: ' + a));
    await sushiChef.rewarder(2).then((a) => console.log('rewarder 2 on sushi pool: ' + a));

    //call init(dummy.address)
    var dummybal = await dummyMuuu.balanceOf(deployer);
    await dummyMuuu.approve(rewardermuuu.address, dummybal, { from: deployer });
    console.log('approve dummyMuuu for ' + dummybal);
    var dummybal = await dummyMuuuKgl.balanceOf(deployer);
    await dummyMuuuKgl.approve(rewardermukgl.address, dummybal, { from: deployer });
    console.log('approve dummyMuuu for ' + dummybal);

    var muuubalance = await muuu.balanceOf(deployer);
    muuubalance = muuubalance.div(new BN('2'));
    await muuu.transfer(rewardermuuu.address, muuubalance, { from: deployer });
    await muuu.transfer(rewardermukgl.address, muuubalance, { from: deployer });
    console.log('send muuu to rewardermuuu: ' + muuubalance);
    await rewardermuuu.init(dummyMuuu.address, { from: deployer });
    console.log('init rewardermuuu');
    await rewardermukgl.init(dummyMuuuKgl.address, { from: deployer });
    console.log('init rewardermukgl');
  });
});
