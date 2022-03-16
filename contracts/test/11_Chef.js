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
const ChefExtraRewards = artifacts.require('ChefExtraRewards');

const IERC20 = artifacts.require('IERC20');

//3. extra rewards, but with v1 gauges

contract('Test masterchef rewards', async (accounts) => {
  it('should deposit lp tokens and earn cvx', async () => {
    let weth = await IERC20.at('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2');

    let admin = accounts[0];
    let userA = accounts[1];
    let userB = accounts[2];
    let caller = accounts[3];

    //system
    let voteproxy = await KaglaVoterProxy.at(contractList.system.voteProxy);
    let booster = await Booster.deployed();
    let rewardFactory = await RewardFactory.deployed();
    let stashFactory = await StashFactory.deployed();
    let poolManager = await PoolManager.deployed();
    let chef = await MuuuMasterChef.deployed();
    let cvx = await MuuuToken.deployed();
    let cvxKgl = await cvxKglToken.deployed();
    let kglDeposit = await KglDepositor.deployed();
    let cvxKglRewards = await booster.lockRewards();
    let cvxRewards = await booster.stakerRewards();
    let cvxKglRewardsContract = await BaseRewardPool.at(cvxKglRewards);
    let cvxRewardsContract = await cvxRewardPool.at(cvxRewards);

    let cvxLP = await IERC20.at(contractList.system.cvxEthSLP);
    let cvxKglLP = await IERC20.at(contractList.system.cvxKglKglSLP);

    //give to different accounts
    var cvxlpBal = await cvxLP.balanceOf(admin);
    await cvxLP.transfer(userA, cvxlpBal);
    var cvxKgllpBal = await cvxKglLP.balanceOf(admin);
    await cvxKglLP.transfer(userB, cvxKgllpBal);

    //add extra rewards
    await weth.sendTransaction({ value: web3.utils.toWei('5.0', 'ether') });

    let extraRewards = await ChefExtraRewards.new(chef.address, weth.address);
    await weth.transfer(extraRewards.address, web3.utils.toWei('5.0', 'ether'));
    await chef.set(0, 10000, extraRewards.address, true, true);

    await cvxLP.approve(chef.address, cvxlpBal, { from: userA });
    await cvxKglLP.approve(chef.address, cvxKgllpBal, { from: userB });

    await chef.deposit(1, cvxlpBal, { from: userA });
    await chef.deposit(0, cvxKgllpBal, { from: userB });

    await chef.userInfo(1, userA).then((a) => console.log('user a cvxeth: ' + JSON.stringify(a)));
    await chef
      .userInfo(0, userB)
      .then((a) => console.log('user b cvxkglkglv: ' + JSON.stringify(a)));
    await time.increase(60);
    await time.advanceBlock();
    await chef.pendingMuuu(1, userA).then((a) => console.log('user a pending: ' + a));
    await chef.pendingMuuu(0, userB).then((a) => console.log('user b pending: ' + a));

    //advance time
    await time.increase(86400);
    await time.advanceBlock();
    await time.advanceBlock();
    await time.advanceBlock();
    console.log('advance time...');

    await chef.pendingMuuu(1, userA).then((a) => console.log('user a pending: ' + a));
    await chef.pendingMuuu(0, userB).then((a) => console.log('user b pending: ' + a));

    //advance time
    await time.increase(86400);
    await time.advanceBlock();
    await time.advanceBlock();
    await time.advanceBlock();
    console.log('advance time...');

    await chef.pendingMuuu(1, userA).then((a) => console.log('user a pending: ' + a));
    await chef.pendingMuuu(0, userB).then((a) => console.log('user b pending: ' + a));

    //advance time
    await time.increase(86400);
    await time.advanceBlock();
    await time.advanceBlock();
    await time.advanceBlock();
    console.log('advance time...');

    await chef.pendingMuuu(1, userA).then((a) => console.log('user a pending: ' + a));
    await chef.pendingMuuu(0, userB).then((a) => console.log('user b pending: ' + a));

    await chef.claim(1, userA);
    await chef.withdraw(0, cvxKgllpBal, { from: userB });
    await chef.pendingMuuu(1, userA).then((a) => console.log('user a pending: ' + a));
    await chef.pendingMuuu(0, userB).then((a) => console.log('user b pending: ' + a));
    await chef.userInfo(1, userA).then((a) => console.log('user a cvxeth: ' + JSON.stringify(a)));
    await chef
      .userInfo(0, userB)
      .then((a) => console.log('user b cvxkglkglv: ' + JSON.stringify(a)));

    await cvxLP.balanceOf(userA).then((a) => console.log('user a lp on wallet: ' + a));
    await cvxKglLP.balanceOf(userB).then((a) => console.log('user b lp on wallet: ' + a));
    await cvx.balanceOf(userA).then((a) => console.log('user a cvx on wallet: ' + a));
    await cvx.balanceOf(userB).then((a) => console.log('user b cvx on wallet: ' + a));
    await weth.balanceOf(userA).then((a) => console.log('user a weth on wallet: ' + a));
    await weth.balanceOf(userB).then((a) => console.log('user b weth on wallet: ' + a));
  });
});
