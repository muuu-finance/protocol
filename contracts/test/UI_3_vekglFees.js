const { BN, constants, expectEvent, expectRevert, time } = require('@openzeppelin/test-helpers');

var jsonfile = require('jsonfile');
var contractList = jsonfile.readFileSync('./contracts.json');

const KglDepositor = artifacts.require('KglDepositor');
const Booster = artifacts.require('Booster');
const KaglaVoterProxy = artifacts.require('KaglaVoterProxy');
const IERC20 = artifacts.require('IERC20');
const IWalletCheckerDebug = artifacts.require('IWalletCheckerDebug');
const IBurner = artifacts.require('IBurner');
const VirtualBalanceRewardPool = artifacts.require('VirtualBalanceRewardPool');

contract('Claim vekgl fees', async (accounts) => {
  it('should pull admin fees and claim to muuu', async () => {
    let kgl = await IERC20.at('0xD533a949740bb3306d119CC777fa900bA034cd52');

    let dai = await IERC20.at('0x6B175474E89094C44Da98b954EedeAC495271d0F');
    let vekgl = await IERC20.at('0x5f3b5DfEb7B28CDbD7FAba78963EE202a494e2A2');
    let threekgl = await IERC20.at('0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490');
    let walletChecker = await IWalletCheckerDebug.at('0xca719728Ef172d0961768581fdF35CB116e0B7a4');
    let checkerAdmin = '0x40907540d8a6C65c637785e8f8B742ae6b0b9968';
    let vekglWhale = '0xb01151B93B5783c252333Ce0707D704d0BBDF5EC';

    //memo: these burner addresses may change
    let burner = await IBurner.at('0xeCb456EA5365865EbAb8a2661B0c503410e9B347');
    let underlyingburner = await IBurner.at('0x786B374B5eef874279f4B7b4de16940e57301A58');
    ///////

    let voteproxy = await KaglaVoterProxy.at(contractList.system.voteProxy);
    let booster = await Booster.at(contractList.system.booster);
    let kglDeposit = await KglDepositor.at(contractList.system.kglDepositor);
    let cvxKgl = await IERC20.at(contractList.system.cvxKgl);
    let vekglRewardAddress = await booster.lockFees();
    let vekglRewardsContract = await VirtualBalanceRewardPool.at(vekglRewardAddress);

    let self = accounts[0];

    //add to whitelist
    await walletChecker.approveWallet(voteproxy.address, { from: checkerAdmin, gasPrice: 0 });
    console.log('added to whitelist');

    let isWhitelist = await walletChecker.check(voteproxy.address);
    console.log('is whitelist? ' + isWhitelist);

    // ---------- deposit kgl ---------- //////

    //deposit kgl
    // let kglBal = await kgl.balanceOf(self);
    // await kgl.approve(kglDeposit.address,0);
    // await kgl.approve(kglDeposit.address,kglBal);
    // await kglDeposit.deposit(kglBal,false,"0x0000000000000000000000000000000000000000");

    await kglDeposit.lockKagla();
    await cvxKgl.totalSupply().then((a) => console.log('cvxKgl supply: ' + a));
    await vekgl.balanceOf(voteproxy.address).then((a) => console.log('proxy veKgl: ' + a));

    // -----------------------------///

    //move forward about 2 weeks
    await time.increase(86400 * 15);
    await time.advanceBlock();
    console.log('advance time...');

    /// ----- burn fees to vekgl claim contracts (kagla dao side) ----
    let burnerBalance = await threekgl.balanceOf('0xA464e6DCda8AC41e03616F95f4BC98a13b8922Dc');
    console.log('3kgl on burner: ' + burnerBalance);

    await dai.balanceOf(burner.address).then((a) => console.log('burner dai: ' + a));
    //withdraw 3kgl fees
    await burner.withdraw_admin_fees('0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7');
    console.log('admin fees withdrawn from pool');
    await dai.balanceOf(burner.address).then((a) => console.log('burner dai: ' + a));
    await dai
      .balanceOf(underlyingburner.address)
      .then((a) => console.log('dai on underlyingburner: ' + a));

    //burn dai/usdt/usdc
    await burner.burn(dai.address);
    await burner.burn('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
    await burner.burn('0xdAC17F958D2ee523a2206206994597C13D831ec7');
    console.log('burnt single coins');

    await dai.balanceOf(burner.address).then((a) => console.log('burner dai: ' + a));
    await dai
      .balanceOf(underlyingburner.address)
      .then((a) => console.log('dai on underlyingburner: ' + a));

    //execute to wrap everything to 3kgl then send to "receiver" at 0xa464
    await underlyingburner.execute();
    console.log('burner executed');

    //should be zero now that its transfered
    await dai.balanceOf(burner.address).then((a) => console.log('burner dai: ' + a));
    await dai
      .balanceOf(underlyingburner.address)
      .then((a) => console.log('dai on underlyingburner: ' + a));
    //burn 3kgl
    await burner.burn(threekgl.address);
    console.log('burn complete, checkpoit 3kgl');

    let burnerBalance2 = await threekgl.balanceOf('0xA464e6DCda8AC41e03616F95f4BC98a13b8922Dc');
    console.log('3kgl on burner: ' + burnerBalance2);

    /// ----- burn to vekgl claim contract complete ----

    //claim fees for muuu platform
    await booster.earmarkFees();
    console.log('fees earmarked');

    await threekgl
      .balanceOf(vekglRewardsContract.address)
      .then((a) => console.log('vekglRewardsContract balance: ' + a));
  });
});
