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
const cvxRewardPool = artifacts.require('cvxRewardPool');
const MuuuToken = artifacts.require('MuuuToken');
const cvxKglToken = artifacts.require('cvxKglToken');
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
    let cvx = await MuuuToken.at(contractList.system.cvx);
    let cvxKgl = await cvxKglToken.at(contractList.system.cvxKgl);
    let cvxLP = await IERC20.at(contractList.system.cvxEthSLP);
    let cvxKglLP = await IERC20.at(contractList.system.cvxKglKglSLP);
    let crvDeposit = await KglDepositor.at(contractList.system.crvDepositor);
    let crv = await IERC20.at('0xD533a949740bb3306d119CC777fa900bA034cd52');
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
    let dummyMuuuKgl = await ChefToken.at(contractList.system.chefcvxKglToken);
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
    //get cvx slp
    await exchange.swapExactTokensForTokens(
      web3.utils.toWei('1.0', 'ether'),
      0,
      [weth.address, cvx.address],
      deployer,
      starttime + 3000,
      { from: deployer }
    );
    var cvxbalance = await cvx.balanceOf(deployer);
    console.log('swapped for cvx: ' + cvxbalance);
    wethBalance = await weth.balanceOf(deployer);
    console.log('weth remainig: ' + wethBalance);
    //trade for a bunch of cvx
    //add to slp using a portion
    await cvx.approve(exchangerouter.address, cvxbalance, { from: deployer });
    await weth.approve(exchangerouter.address, wethBalance, { from: deployer });
    await exchangerouter.addLiquidity(
      weth.address,
      cvx.address,
      web3.utils.toWei('1.0', 'ether'),
      cvxbalance,
      0,
      0,
      deployer,
      starttime + 3000,
      { from: deployer }
    );
    var lpbalance = await cvxLP.balanceOf(deployer);
    //  console.log("cvx lpbalance: " +lpbalance);

    //send to test account
    await cvxLP.transfer(accounts[0], lpbalance, { from: deployer });
    await cvxLP.balanceOf(accounts[0]).then((a) => console.log('cvxEth lp balance: ' + a));

    //get cvxcrv slp
    await exchange.swapExactTokensForTokens(
      web3.utils.toWei('1.0', 'ether'),
      0,
      [weth.address, crv.address],
      deployer,
      starttime + 3000,
      { from: deployer }
    );
    var crvbalance = await crv.balanceOf(deployer);
    console.log('swapped for cvx: ' + cvxbalance);
    var depositamount = crvbalance.div(new BN('2'));
    await crv.approve(crvDeposit.address, crvbalance, { from: deployer });
    await crvDeposit.deposit(depositamount, false, addressZero, { from: deployer });
    var cvxcrvBal = await cvxKgl.balanceOf(deployer);
    crvbalance = await crv.balanceOf(deployer);
    console.log('cvxcrv bal: ' + cvxcrvBal);
    console.log('crv bal: ' + crvbalance);
    await crv.approve(exchange.address, crvbalance, { from: deployer });
    await cvxKgl.approve(exchange.address, crvbalance, { from: deployer });
    console.log('approved crv and cvxcrv');
    await exchangerouter.addLiquidity(
      crv.address,
      cvxKgl.address,
      crvbalance,
      cvxcrvBal,
      0,
      0,
      deployer,
      starttime + 3000,
      { from: deployer }
    );
    var cvxKgllpbalance = await cvxKglLP.balanceOf(deployer);
    // console.log("cvxcrv lpbalance: " +lpbalance);

    //send to test account
    await cvxKglLP.transfer(accounts[0], cvxKgllpbalance, { from: deployer });
    await cvxKglLP.balanceOf(accounts[0]).then((a) => console.log('cvxcrvKgl lp balance: ' + a));

    //get more cvx
    // await exchange.swapExactTokensForTokens(web3.utils.toWei("6.0", "ether"),0,[weth.address,cvx.address],deployer,starttime+3000,{from:deployer});
    cvxbalance = await cvx.balanceOf(deployer);
    console.log('cvx for init: ' + cvxbalance);

    //add slot slot for dummy token on muuu master chef
    // await chef.add(8000000000,dummyMuuu.address,addressZero,true,{from:multisig,gasPrice:0});
    // console.log("add slot to muuu chef");
    // await chef.add(12000000000,dummyMuuuKgl.address,addressZero,true,{from:multisig,gasPrice:0});
    // console.log("add slot to muuu chef");

    //create rewarder for cvx/eth
    let rewardercvx = await MuuuRewarder.at(contractList.system.cvxEthRewarder);
    // let rewardercvx = await MuuuRewarder.new(cvxLP.address,cvx.address,multisig,sushiChef.address,chef.address,2);
    console.log('created cvxeth rewarder at ' + rewardercvx.address);

    let rewardercvxcrv = await MuuuRewarder.at(contractList.system.cvxKglKglRewarder);
    //let rewardercvxcrv = await MuuuRewarder.new(cvxKglLP.address,cvx.address,multisig,sushiChef.address,chef.address,3);
    console.log('created cvxcrvcrv rewarder at ' + rewardercvxcrv.address);

    //add to sushi chef pool
    //await sushiChef.add(10000,cvxLP.address,rewardercvx.address,{from:sushiAdmin,gasPrice:0});
    await sushiChef.set(1, 10000, rewardercvx.address, false, { from: sushiAdmin, gasPrice: 0 });
    console.log('added slot to sushi chef');
    //await sushiChef.add(10000,cvxKglLP.address,rewardercvxcrv.address,{from:sushiAdmin,gasPrice:0});
    await sushiChef.set(2, 10000, rewardercvxcrv.address, false, { from: sushiAdmin, gasPrice: 0 });
    console.log('added slot to sushi chef');

    await sushiChef.rewarder(1).then((a) => console.log('rewarder 1 on sushi pool: ' + a));
    await sushiChef.rewarder(2).then((a) => console.log('rewarder 2 on sushi pool: ' + a));

    //call init(dummy.address)
    var dummybal = await dummyMuuu.balanceOf(deployer);
    await dummyMuuu.approve(rewardercvx.address, dummybal, { from: deployer });
    console.log('approve dummyMuuu for ' + dummybal);
    var dummybal = await dummyMuuuKgl.balanceOf(deployer);
    await dummyMuuuKgl.approve(rewardercvxcrv.address, dummybal, { from: deployer });
    console.log('approve dummyMuuu for ' + dummybal);

    var cvxbalance = await cvx.balanceOf(deployer);
    cvxbalance = cvxbalance.div(new BN('2'));
    await cvx.transfer(rewardercvx.address, cvxbalance, { from: deployer });
    await cvx.transfer(rewardercvxcrv.address, cvxbalance, { from: deployer });
    console.log('send cvx to rewardercvx: ' + cvxbalance);
    await rewardercvx.init(dummyMuuu.address, { from: deployer });
    console.log('init rewardercvx');
    await rewardercvxcrv.init(dummyMuuuKgl.address, { from: deployer });
    console.log('init rewardercvxcrv');
  });
});
