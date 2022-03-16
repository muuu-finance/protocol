const { BN, constants, expectEvent, expectRevert, time } = require('@openzeppelin/test-helpers');
var jsonfile = require('jsonfile');
var contractList = jsonfile.readFileSync('./contracts.json');

const Booster = artifacts.require('Booster');
const KglDepositor = artifacts.require('KglDepositor');
const KaglaVoterProxy = artifacts.require('KaglaVoterProxy');
const ExtraRewardStashV2 = artifacts.require('ExtraRewardStashV2');
const BaseRewardPool = artifacts.require('BaseRewardPool');
const VirtualBalanceRewardPool = artifacts.require('VirtualBalanceRewardPool');
//const muKglRewardPool = artifacts.require("muKglRewardPool");
const muuuRewardPool = artifacts.require('muuuRewardPool');
const MuuuToken = artifacts.require('MuuuToken');
const muKglToken = artifacts.require('muKglToken');
const StashFactory = artifacts.require('StashFactory');
const RewardFactory = artifacts.require('RewardFactory');
const TokenFactory = artifacts.require('TokenFactory');
const PoolManager = artifacts.require('PoolManager');

const IExchange = artifacts.require('IExchange');
const IKaglaFi = artifacts.require('I3KaglaFi');
const IERC20 = artifacts.require('IERC20');

contract('Shutdown Test', async (accounts) => {
  it('should deposit, shutdown, withdraw, upgrade, redeposit', async () => {
    let kgl = await IERC20.at('0xD533a949740bb3306d119CC777fa900bA034cd52');
    let weth = await IERC20.at('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2');
    let dai = await IERC20.at('0x6b175474e89094c44da98b954eedeac495271d0f');
    let exchange = await IExchange.at('0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D');
    let threekglswap = await IKaglaFi.at('0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7');
    let threeKgl = await IERC20.at('0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490');
    let threeKglGauge = '0xbFcF63294aD7105dEa65aA58F8AE5BE2D9d0952A';
    let threeKglSwap = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';

    let admin = accounts[0];
    let userA = accounts[1];
    let userB = accounts[2];
    let caller = accounts[3];
    //system
    let voteproxy = await KaglaVoterProxy.at(contractList.system.voteProxy);
    let booster = await Booster.deployed();
    let voterewardFactoryproxy = await RewardFactory.deployed();
    let stashFactory = await StashFactory.deployed();
    let poolManager = await PoolManager.deployed();
    let muuu = await MuuuToken.deployed();
    let muKgl = await muKglToken.deployed();
    let kglDeposit = await KglDepositor.deployed();
    let muKglRewards = await booster.lockRewards();
    let muuuRewards = await booster.stakerRewards();
    let muKglRewardsContract = await BaseRewardPool.at(muKglRewards);
    let muuuRewardsContract = await muuuRewardPool.at(muuuRewards);

    var poolId = contractList.pools.find((pool) => pool.name == '3pool').id;
    var poolinfo = await booster.poolInfo(poolId);
    var rewardPoolAddress = poolinfo.kglRewards;
    var rewardPool = await BaseRewardPool.at(rewardPoolAddress);

    let starttime = await time.latest();
    console.log('current block time: ' + starttime);
    await time.latestBlock().then((a) => console.log('current block: ' + a));

    //get 3kgl
    await weth.sendTransaction({ value: web3.utils.toWei('2.0', 'ether'), from: userA });
    let startingWeth = await weth.balanceOf(userA);
    await weth.approve(exchange.address, startingWeth, { from: userA });
    await exchange.swapExactTokensForTokens(
      startingWeth,
      0,
      [weth.address, dai.address],
      userA,
      starttime + 3000,
      { from: userA }
    );
    let startingDai = await dai.balanceOf(userA);
    await dai.approve(threekglswap.address, startingDai, { from: userA });
    await threekglswap.add_liquidity([startingDai, 0, 0], 0, { from: userA });
    let startingThreeKgl = await threeKgl.balanceOf(userA);
    console.log('3kgl: ' + startingThreeKgl);

    //deposit, funds move to gauge
    await threeKgl.approve(booster.address, 0, { from: userA });
    await threeKgl.approve(booster.address, startingThreeKgl, { from: userA });
    await booster.deposit(poolId, 10000, true, { from: userA });
    await threeKgl.balanceOf(userA).then((a) => console.log('3kgl on wallet: ' + a));
    await rewardPool.balanceOf(userA).then((a) => console.log('deposited lp: ' + a));
    await threeKgl.balanceOf(booster.address).then((a) => console.log('3kgl at booster ' + a));
    await voteproxy.balanceOfPool(threeKglGauge).then((a) => console.log('3kgl on gauge ' + a));

    //shutdown, funds move back to booster(depositor)
    await booster.shutdownSystem(false, { from: admin });
    console.log('system shutdown');
    await threeKgl.balanceOf(userA).then((a) => console.log('3kgl on wallet: ' + a));
    await rewardPool.balanceOf(userA).then((a) => console.log('deposited lp: ' + a));
    await threeKgl.balanceOf(booster.address).then((a) => console.log('3kgl at booster ' + a));
    await voteproxy.balanceOfPool(threeKglGauge).then((a) => console.log('3kgl on gauge ' + a));

    //try to deposit while in shutdown state, will revert
    console.log('try deposit again');
    await booster
      .deposit(poolId, 10000, true, { from: userA })
      .catch((a) => console.log('--> deposit reverted'));

    //withdraw lp tokens from old booster
    console.log('withdraw');
    await booster.withdrawAll(poolId, { from: userA });
    await threeKgl.balanceOf(userA).then((a) => console.log('3kgl on wallet: ' + a));
    await rewardPool.balanceOf(userA).then((a) => console.log('deposited lp: ' + a));
    await threeKgl.balanceOf(booster.address).then((a) => console.log('3kgl at booster ' + a));
    await voteproxy.balanceOfPool(threeKglGauge).then((a) => console.log('3kgl on gauge ' + a));

    //relaunch the system and connect to voteproxy and muuu contracts

    //first booster and set as operator on vote proxy
    console.log('create new booster and factories');
    let booster2 = await Booster.new(voteproxy.address, muuu.address, 0);
    await voteproxy.setOperator(booster2.address);
    console.log('set new booster as voteproxy operator');

    //create factories
    let rewardFactory2 = await RewardFactory.new(booster2.address);
    let stashFactory2 = await StashFactory.new(booster2.address, rewardFactory2.address);
    let tokenFactory2 = await TokenFactory.new(booster2.address);
    await booster2.setFactories(
      rewardFactory2.address,
      stashFactory2.address,
      tokenFactory2.address
    );
    console.log('factories set');

    //tell muuu to update its operator(mint role)
    await muuu.updateOperator();
    console.log('muuu operater updated');

    //create new reward pools for staking muKgl and muuu
    let muKglRewardsContract2 = await BaseRewardPool.new(
      0,
      muKgl.address,
      kgl.address,
      booster2.address,
      rewardFactory2.address
    );
    console.log('create new muKgl reward pool');
    let muuuRewardsContract2 = await muuuRewardPool.new(
      muuu.address,
      kgl.address,
      kglDeposit.address,
      muKglRewardsContract2.address,
      muKgl.address,
      booster2.address,
      admin
    );
    console.log('create new muuu reward pool');
    await booster2.setRewardContracts(muKglRewardsContract2.address, muuuRewardsContract2.address);
    console.log('set stake reward contracts');

    //set vekgl info
    await booster2.setFeeInfo();
    console.log('vekgl fee info set');

    let poolManager2 = await PoolManager.new(booster2.address);
    await booster2.setPoolManager(poolManager2.address);

    //add 3kgl pool
    await poolManager2.addPool(threeKglSwap, threeKglGauge, 0);
    console.log('3kgl pool added');

    poolinfo = await booster2.poolInfo(0);
    rewardPoolAddress = poolinfo.kglRewards;
    rewardPool = await BaseRewardPool.at(rewardPoolAddress);
    console.log('pool lp token ' + poolinfo.lptoken);
    console.log('pool gauge ' + poolinfo.gauge);
    console.log('pool reward contract at ' + rewardPool.address);

    //deposit to new booster, tokens move to gauge
    let threeKglbalance = await threeKgl.balanceOf(userA);
    await threeKgl.approve(booster2.address, 0, { from: userA });
    await threeKgl.approve(booster2.address, threeKglbalance, { from: userA });
    await booster2.depositAll(0, true, { from: userA });
    await threeKgl.balanceOf(userA).then((a) => console.log('3kgl on wallet: ' + a));
    await rewardPool.balanceOf(userA).then((a) => console.log('deposited lp: ' + a));
    await threeKgl.balanceOf(booster2.address).then((a) => console.log('3kgl at booster2 ' + a));
    await voteproxy.balanceOfPool(threeKglGauge).then((a) => console.log('3kgl on gauge ' + a));

    //increase time
    await time.increase(15 * 86400);
    await time.advanceBlock();
    console.log('advance time...');

    await time.latest().then((a) => console.log('current block time: ' + a));
    await time.latestBlock().then((a) => console.log('current block: ' + a));

    //distribute rewards
    await booster2.earmarkRewards(0, { from: caller });
    console.log('rewards earmarked');

    //3kgl reward pool for kgl
    await rewardPool.balanceOf(userA).then((a) => console.log('reward balance: ' + a));
    await rewardPool.earned(userA).then((a) => console.log('rewards earned(unclaimed): ' + a));

    //increase time
    await time.increase(4 * 86400);
    await time.advanceBlock();

    //check earned balances again
    await rewardPool.balanceOf(userA).then((a) => console.log('reward balance: ' + a));
    await rewardPool.earned(userA).then((a) => console.log('rewards earned(unclaimed): ' + a));
    await kgl.balanceOf(userA).then((a) => console.log('userA kgl: ' + a));
    await muuu.balanceOf(userA).then((a) => console.log('userA muuu: ' + a));

    //claim rewards
    await rewardPool.getReward({ from: userA });
    console.log('getReward()');
    await kgl.balanceOf(userA).then((a) => console.log('userA kgl: ' + a));
    await muuu.balanceOf(userA).then((a) => console.log('userA muuu: ' + a));
    await kgl.balanceOf(rewardPool.address).then((a) => console.log('rewards left: ' + a));
  });
});
