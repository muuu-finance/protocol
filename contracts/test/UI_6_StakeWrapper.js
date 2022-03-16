// const { BN, constants, expectEvent, expectRevert, time } = require('@openzeppelin/test-helpers');
const { BN, time } = require('@openzeppelin/test-helpers');
var jsonfile = require('jsonfile');
var contractList = jsonfile.readFileSync('./contracts.json');

const Booster = artifacts.require('Booster');
const KglDepositor = artifacts.require('KglDepositor');
const MuuuToken = artifacts.require('MuuuToken');
const cvxKglToken = artifacts.require('cvxKglToken');
const KaglaVoterProxy = artifacts.require('KaglaVoterProxy');
const BaseRewardPool = artifacts.require('BaseRewardPool');
const MuuuStakingWrapper = artifacts.require('MuuuStakingWrapper');
const IERC20 = artifacts.require('IERC20');
const IKaglaAavePool = artifacts.require('IKaglaAavePool');
const IExchange = artifacts.require('IExchange');
const IUniswapV2Router01 = artifacts.require('IUniswapV2Router01');
const MuuuMining = artifacts.require('MuuuMining');

contract('Test stake wrapper', async (accounts) => {
  it('should deposit lp tokens and earn rewards while being transferable', async () => {
    let deployer = '0x947B7742C403f20e5FaCcDAc5E092C943E7D0277';
    let multisig = '0xa3C5A1e09150B75ff251c1a7815A07182c3de2FB';
    let addressZero = '0x0000000000000000000000000000000000000000';

    //system
    let booster = await Booster.at(contractList.system.booster);
    let voteproxy = await KaglaVoterProxy.at(contractList.system.voteProxy);
    let cvx = await MuuuToken.at(contractList.system.cvx);
    let crv = await IERC20.at('0xD533a949740bb3306d119CC777fa900bA034cd52');
    let stkaave = await IERC20.at('0x4da27a545c0c5B758a6BA100e3a049001de870f5');
    let cvxKgl = await cvxKglToken.at(contractList.system.cvxKgl);
    let cvxKglLP = await IERC20.at(contractList.system.cvxKglKglSLP);
    let exchange = await IExchange.at('0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F');
    let exchangerouter = await IUniswapV2Router01.at('0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F');
    let weth = await IERC20.at('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2');
    let kaglaAave = await IERC20.at('0xFd2a8fA60Abd58Efe3EeE34dd494cD491dC14900');
    let muuuAave = await IERC20.at('0x23F224C37C3A69A058d86a54D3f561295A93d542');
    let aavepool = 24;
    let aaveswap = await IKaglaAavePool.at('0xDeBF20617708857ebe4F679508E7b7863a8A8EeE');
    let muuuAaveRewards = await BaseRewardPool.at('0xE82c1eB4BC6F92f85BF7EB6421ab3b882C3F5a7B');
    let dai = await IERC20.at('0x6B175474E89094C44Da98b954EedeAC495271d0F');

    let userA = accounts[0];
    let userB = accounts[1];
    let userC = accounts[2];

    let starttime = await time.latest();
    await weth.sendTransaction({ value: web3.utils.toWei('10.0', 'ether'), from: deployer });
    var wethBalance = await weth.balanceOf(deployer);
    console.log('receive weth: ' + wethBalance);
    await weth.approve(exchange.address, wethBalance, { from: deployer });
    await exchange.swapExactTokensForTokens(
      web3.utils.toWei('10.0', 'ether'),
      0,
      [weth.address, dai.address],
      deployer,
      starttime + 3000,
      { from: deployer }
    );
    var daibalance = await dai.balanceOf(deployer);
    console.log('swapped for dai: ' + daibalance);

    await dai.approve(aaveswap.address, daibalance, { from: deployer });
    console.log('approved');
    await aaveswap.add_liquidity([daibalance, 0, 0], 0, true, { from: deployer });
    console.log('liq added');
    var lpbalance = await kaglaAave.balanceOf(deployer);
    console.log('lpbalance: ' + lpbalance);

    var touserB = lpbalance.div(new BN('3'));
    await kaglaAave.transfer(userB, touserB, { from: deployer });
    lpbalance = await kaglaAave.balanceOf(deployer);
    await kaglaAave.transfer(userA, lpbalance, { from: deployer });
    var userABalance = await kaglaAave.balanceOf(userA);
    var userBBalance = await kaglaAave.balanceOf(userB);
    console.log('userA: ' + userABalance + ',  userB: ' + userBBalance);

    let lib = await MuuuMining.at(contractList.system.cvxMining);
    console.log('mining lib at: ' + lib.address);
    await MuuuStakingWrapper.link('MuuuMining', lib.address);
    let staker = await MuuuStakingWrapper.new(
      kaglaAave.address,
      muuuAave.address,
      muuuAaveRewards.address,
      aavepool,
      addressZero,
      ' Test',
      'tst',
      { from: deployer }
    );
    console.log('staker token: ' + staker.address);
    await staker.name().then((a) => console.log('name: ' + a));
    await staker.symbol().then((a) => console.log('symbol: ' + a));
    await staker.setApprovals();
    await staker.addRewards({ from: deployer });

    let rewardCount = await staker.rewardLength();
    for (var i = 0; i < rewardCount; i++) {
      var rInfo = await staker.rewards(i);
      console.log('rewards ' + i + ': ' + JSON.stringify(rInfo));
    }

    //user A will deposit kagla tokens and user B muuu
    await kaglaAave.approve(staker.address, userABalance, { from: userA });
    await kaglaAave.approve(booster.address, userBBalance, { from: userB });
    await muuuAave.approve(staker.address, userBBalance, { from: userB });
    console.log('approved booster and staker');
    await booster.depositAll(aavepool, false, { from: userB });
    console.log('deposited into muuu');

    var tx = await staker.deposit(userABalance, userA, { from: userA });
    console.log('user A deposited: ' + tx.receipt.gasUsed);
    await muuuAave.balanceOf(userB).then((a) => console.log('user b muuu aave: ' + a));
    var tx = await staker.stake(userBBalance, userB, { from: userB });
    console.log('user b staked: ' + tx.receipt.gasUsed);
  });
});
