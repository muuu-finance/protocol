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

const IExchange = artifacts.require('IExchange');
const IVoting = artifacts.require('IVoting');
const IVoteStarter = artifacts.require('IVoteStarter');
const I2KaglaFi = artifacts.require('I2KaglaFi');
const I3KaglaFi = artifacts.require('I3KaglaFi');
const IERC20 = artifacts.require('IERC20');
const IKaglaGauge = artifacts.require('IKaglaGauge');
const IKaglaGaugeDebug = artifacts.require('IKaglaGaugeDebug');
const IWalletCheckerDebug = artifacts.require('IWalletCheckerDebug');
const IEscro = artifacts.require('IEscro');
const IGaugeController = artifacts.require('IGaugeController');

contract('Voting Test', async (accounts) => {
  it('should add to whitelist and test voting functions', async () => {
    let kgl = await IERC20.at('0xD533a949740bb3306d119CC777fa900bA034cd52');
    let threeKgl = await IERC20.at('0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490');
    let weth = await IERC20.at('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2');
    let vekgl = await IERC20.at('0x5f3b5DfEb7B28CDbD7FAba78963EE202a494e2A2');
    let exchange = await IExchange.at('0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D');
    let walletChecker = await IWalletCheckerDebug.at('0xca719728Ef172d0961768581fdF35CB116e0B7a4');
    let escrow = await IEscro.at('0x5f3b5DfEb7B28CDbD7FAba78963EE202a494e2A2');
    let checkerAdmin = '0x40907540d8a6C65c637785e8f8B742ae6b0b9968';
    let vekglWhale = '0xb01151B93B5783c252333Ce0707D704d0BBDF5EC';
    let vote = await IVoting.at('0xE478de485ad2fe566d49342Cbd03E49ed7DB3356');
    let votestart = await IVoteStarter.at('0xE478de485ad2fe566d49342Cbd03E49ed7DB3356');
    let controller = await IGaugeController.at('0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB');
    let threeKglGauge = '0xbFcF63294aD7105dEa65aA58F8AE5BE2D9d0952A';

    let admin = accounts[0];
    let userA = accounts[1];
    let userB = accounts[2];
    let caller = accounts[3];

    //system
    let voteproxy = await KaglaVoterProxy.at(contractList.system.voteProxy);
    let booster = await Booster.deployed();
    let rewardFactory = await RewardFactory.deployed();
    let stashFactory = await StashFactory.deployed();
    let muuu = await MuuuToken.deployed();
    let muKgl = await muKglToken.deployed();
    let kglDeposit = await KglDepositor.deployed();
    let muKglRewards = await booster.lockRewards();
    let muuuRewards = await booster.stakerRewards();
    let muKglRewardsContract = await BaseRewardPool.at(muKglRewards);
    let muuuRewardsContract = await muuuRewardPool.at(muuuRewards);

    var poolId = contractList.pools.find((pool) => pool.name == '3pool').id;
    let poolinfo = await booster.poolInfo(poolId);
    let rewardPoolAddress = poolinfo.kglRewards;
    let rewardPool = await BaseRewardPool.at(rewardPoolAddress);

    let starttime = await time.latest();
    console.log('current block time: ' + starttime);
    await time.latestBlock().then((a) => console.log('current block: ' + a));

    //add to whitelist
    await walletChecker.approveWallet(voteproxy.address, { from: checkerAdmin, gasPrice: 0 });
    console.log('approve wallet');
    let isWhitelist = await walletChecker.check(voteproxy.address);
    console.log('is whitelist? ' + isWhitelist);

    //get kgl
    await weth.sendTransaction({ value: web3.utils.toWei('1.0', 'ether'), from: userA });
    let wethForKgl = await weth.balanceOf(userA);
    await weth.approve(exchange.address, 0, { from: userA });
    await weth.approve(exchange.address, wethForKgl, { from: userA });
    await exchange.swapExactTokensForTokens(
      wethForKgl,
      0,
      [weth.address, kgl.address],
      userA,
      starttime + 3000,
      { from: userA }
    );
    let startingkgl = await kgl.balanceOf(userA);
    console.log('kgl to deposit: ' + startingkgl);

    //deposit kgl
    await kgl.approve(kglDeposit.address, 0, { from: userA });
    await kgl.approve(kglDeposit.address, startingkgl, { from: userA });
    await kglDeposit.deposit(startingkgl, true, '0x0000000000000000000000000000000000000000', {
      from: userA,
    });
    console.log('kgl deposited');
    await muKgl.balanceOf(userA).then((a) => console.log('muKgl on wallet: ' + a));
    await muKgl.totalSupply().then((a) => console.log('muKgl supply: ' + a));
    await kgl.balanceOf(kglDeposit.address).then((a) => console.log('depositor kgl(>0): ' + a));
    await kgl.balanceOf(voteproxy.address).then((a) => console.log('proxy kgl(==0): ' + a));
    await vekgl.balanceOf(voteproxy.address).then((a) => console.log('proxy veKgl(==0): ' + a));

    await time.increase(86400);
    await time.advanceBlock();
    console.log('advance time....');

    //voting
    console.log('vote testing...');

    //create new proposal on dao
    await votestart.newVote('0x00000001', 'test', false, false, { from: vekglWhale, gasPrice: 0 });
    let votesLength = await votestart.votesLength();
    let currentProposal = votesLength - 1;
    console.log('created new dao proposal ' + currentProposal);

    //before vote stats
    let currentVote = await vote.getVote(currentProposal);
    console.log('current vote status: ' + currentVote[0]);
    console.log('current vote yea: ' + currentVote[6]);
    console.log('current vote nay: ' + currentVote[7]);

    //vote as non-delegate (revert)
    await booster
      .vote(currentProposal, vote.address, true, { from: userA })
      .catch((a) => console.log('->reverted non votedelgate tx'));

    //vote as delegate
    await booster.vote(currentProposal, vote.address, true);
    console.log('voted');

    //after vote stats
    let updatedVote = await vote.getVote(currentProposal);
    console.log('current vote status: ' + updatedVote[0]);
    console.log('current vote yea: ' + updatedVote[6]);
    console.log('current vote nay: ' + updatedVote[7]);

    //test gauge weight voting too
    console.log('gauge weight testing...');

    var voteInfo = await controller.vote_user_slopes(voteproxy.address, threeKglGauge);
    console.log('gauge weight power before: ' + voteInfo[1]);

    //vote as non-delegate(revert)
    await booster
      .voteGaugeWeight([threeKglGauge], [10000], { from: userA })
      .catch((a) => console.log('->reverted non votedelgate tx'));

    //vote as delegate
    await booster.voteGaugeWeight([threeKglGauge], [10000]);

    //show that weight power has changed
    voteInfo = await controller.vote_user_slopes(voteproxy.address, threeKglGauge);
    console.log('gauge weight power after: ' + voteInfo[1]);
  });
});
