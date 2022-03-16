// const { BN, constants, expectEvent, expectRevert, time } = require('@openzeppelin/test-helpers');
const { BN, time } = require('@openzeppelin/test-helpers');
var jsonfile = require('jsonfile');
var contractList = jsonfile.readFileSync('./contracts.json');

const Booster = artifacts.require('Booster');
const KglDepositor = artifacts.require('KglDepositor');
const MuuuToken = artifacts.require('MuuuToken');
const muuuKglToken = artifacts.require('muuuKglToken');
const KaglaVoterProxy = artifacts.require('KaglaVoterProxy');
const BaseRewardPool = artifacts.require('BaseRewardPool');
const MuuuStakingWrapper = artifacts.require('MuuuStakingWrapper');
const MuuuStakingWrapperAbra = artifacts.require('MuuuStakingWrapperAbra');
const IERC20 = artifacts.require('IERC20');
const IKaglaAavePool = artifacts.require('IKaglaAavePool');
const IExchange = artifacts.require('IExchange');
const IUniswapV2Router01 = artifacts.require('IUniswapV2Router01');
const MuuuMining = artifacts.require('MuuuMining');
const I3KaglaFi = artifacts.require('I3KaglaFi');
const I2KaglaFi = artifacts.require('I2KaglaFi');
const ICauldron = artifacts.require('ICauldron');
const IBentoBox = artifacts.require('IBentoBox');
const ProxyFactory = artifacts.require('ProxyFactory');

contract('Test stake wrapper', async (accounts) => {
  it('should deposit lp tokens and earn rewards while being transferable', async () => {
    let deployer = '0x947B7742C403f20e5FaCcDAc5E092C943E7D0277';
    let multisig = '0xa3C5A1e09150B75ff251c1a7815A07182c3de2FB';
    let addressZero = '0x0000000000000000000000000000000000000000';

    //system
    let booster = await Booster.at(contractList.system.booster);
    let voteproxy = await KaglaVoterProxy.at(contractList.system.voteProxy);
    let muuu = await MuuuToken.at(contractList.system.muuu);
    let kgl = await IERC20.at('0xD533a949740bb3306d119CC777fa900bA034cd52');
    let muuuKgl = await muuuKglToken.at(contractList.system.muuuKgl);
    let muuuKglLP = await IERC20.at(contractList.system.muuuKglKglSLP);
    let exchange = await IExchange.at('0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F');
    let exchangerouter = await IUniswapV2Router01.at('0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F');
    let weth = await IERC20.at('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2');
    let kaglatoken = await IERC20.at('0x49849C98ae39Fff122806C06791Fa73784FB3675');
    let kaglaswap = await I2KaglaFi.at('0x93054188d876f558f4a66B2EF1d97d16eDf0895B');
    let underlying = await IERC20.at('0x2260fac5e5542a773aa44fbcfedf7c193bc2c599');

    let userA = accounts[0];
    let userB = accounts[1];
    let userC = accounts[2];
    let userF = accounts[9];
    await web3.eth.sendTransaction({
      from: userF,
      to: deployer,
      value: web3.utils.toWei('80.0', 'ether'),
    });

    let starttime = await time.latest();
    await weth.sendTransaction({ value: web3.utils.toWei('10.0', 'ether'), from: deployer });
    var wethBalance = await weth.balanceOf(deployer);
    console.log('receive weth: ' + wethBalance);
    await weth.approve(exchange.address, wethBalance, { from: deployer });
    await exchange.swapExactTokensForTokens(
      web3.utils.toWei('10.0', 'ether'),
      0,
      [weth.address, underlying.address],
      deployer,
      starttime + 3000,
      { from: deployer }
    );
    var underlyingbalance = await underlying.balanceOf(deployer);
    console.log('swapped for underlying: ' + underlyingbalance);

    await underlying.approve(kaglaswap.address, underlyingbalance, { from: deployer });
    console.log('approved');
    await kaglaswap.add_liquidity([0, underlyingbalance], 0, { from: deployer });
    console.log('liq added');
    var lpbalance = await kaglatoken.balanceOf(deployer);
    console.log('lpbalance: ' + lpbalance);

    let lib = await MuuuMining.at(contractList.system.muuuMining);
    console.log('mining lib at: ' + lib.address);
    await MuuuStakingWrapperAbra.link('MuuuMining', lib.address);

    let master = await MuuuStakingWrapperAbra.new();
    let pfactory = await ProxyFactory.at(contractList.system.proxyFactory);

    //static call first to see what the next address will be
    let clone = await pfactory.clone.call(master.address);
    console.log('clone: ' + clone);
    let clonetx = await pfactory.clone(master.address);

    let staker = await MuuuStakingWrapperAbra.at(clone);
    let pool = contractList.pools.find((a) => a.name == 'ren');
    await staker.initialize(pool.lptoken, pool.token, pool.kglRewards, pool.id, addressZero);
    console.log('staker token: ' + staker.address);
    await staker.name().then((a) => console.log('name: ' + a));
    await staker.symbol().then((a) => console.log('symbol: ' + a));
    await staker.kaglaToken().then((a) => console.log('kagla token: ' + a));
    await staker.muuuToken().then((a) => console.log('muuu token: ' + a));
    // await staker.setCauldron("0x806e16ec797c69afa8590A55723CE4CC1b54050E",{from:deployer});
    // var cauldronaddress =  await staker.cauldrons(1)
    // console.log("cauldron: " +cauldronaddress);

    let rewardCount = await staker.rewardLength();
    for (var i = 0; i < rewardCount; i++) {
      var rInfo = await staker.rewards(i);
      console.log('rewards ' + i + ': ' + JSON.stringify(rInfo));
    }

    var lpbalance = await kaglatoken.balanceOf(deployer);
    console.log('lpbalance: ' + lpbalance);

    await kaglatoken.approve(staker.address, lpbalance, { from: deployer });
    console.log('approved staker');

    var tx = await staker.deposit(lpbalance, userA, { from: deployer });
    console.log('deposited: ' + tx.receipt.gasUsed);

    await staker.totalSupply().then((a) => console.log('staker supply: ' + a));

    var wrapbal = await staker.balanceOf(userA);
    console.log('user a: ' + wrapbal);

    // var bentobox = await IBentoBox.at("0xF5BCE5077908a1b7370B9ae04AdC565EBd643966")
    // await staker.approve(bentobox.address,wrapbal,{from:userA});
    // var breturn = await bentobox.deposit(staker.address,userA,userA,0,wrapbal,{from:userA});
    // console.log("deposited to bento: " +JSON.stringify(breturn));

    // var cauldron = await ICauldron.at(cauldronaddress);
    // await cauldron.addCollateral(userA,false,wrapbal,{from:userA});
    // console.log("collateral added");

    var wrapbal = await staker.balanceOf(userA);
    console.log('user a(token): ' + wrapbal);
    await staker
      .totalBalanceOf(userA)
      .then((a) => console.log('user a total(with collateral): ' + a));

    await staker.earned(userA).then((a) => console.log('user a earned: ' + a));

    await time.increase(86400);
    await time.advanceBlock();
    console.log('advance time...');

    console.log('======');
    await staker.earned(userA).then((a) => console.log('user a earned: ' + a));
    await kgl.balanceOf(userA).then((a) => console.log('user a wallet kgl: ' + a));
    await muuu.balanceOf(userA).then((a) => console.log('user a wallet muuu: ' + a));
    console.log('-----');
    await staker.earned(userB).then((a) => console.log('user b earned: ' + a));
    await kgl.balanceOf(userB).then((a) => console.log('user b wallet kgl: ' + a));
    await muuu.balanceOf(userB).then((a) => console.log('user b wallet muuu: ' + a));

    console.log('checkpoint');
    var tx = await staker.user_checkpoint([userA, addressZero]);
    console.log('checkpoint a gas: ' + tx.receipt.gasUsed);
    var tx = await staker.user_checkpoint([userB, addressZero]);
    console.log('checkpoint b gas: ' + tx.receipt.gasUsed);

    await staker.earned(userA).then((a) => console.log('user a earned: ' + a));
    await staker.earned(userB).then((a) => console.log('user b earned: ' + a));

    await time.increase(86400);
    await time.advanceBlock();
    console.log('advance time...');

    await booster.earmarkRewards(24, { from: deployer });

    await staker.earned(userA).then((a) => console.log('user a earned: ' + a));
    await staker.earned(userB).then((a) => console.log('user b earned: ' + a));

    await kgl.balanceOf(staker.address).then((a) => console.log('staker kgl: ' + a));
    await muuu.balanceOf(staker.address).then((a) => console.log('staker muuu: ' + a));
    for (var i = 0; i < rewardCount; i++) {
      var rInfo = await staker.rewards(i);
      console.log('rewards ' + i + ': ' + JSON.stringify(rInfo));
    }

    console.log('======');
    await staker.earned(userA).then((a) => console.log('user a earned: ' + a));
    await kgl.balanceOf(userA).then((a) => console.log('user a wallet kgl: ' + a));
    await muuu.balanceOf(userA).then((a) => console.log('user a wallet muuu: ' + a));
    for (var i = 0; i < rewardCount; i++) {
      var rInfo = await staker.rewards(i);
      console.log('rewards ' + i + ': ' + JSON.stringify(rInfo));
    }

    await time.increase(86400);
    await time.advanceBlock();
    console.log('\n\nadvance time...');
    console.log('======');
    await staker.earned(userA).then((a) => console.log('user a earned: ' + a));
    await kgl.balanceOf(userA).then((a) => console.log('user a wallet kgl: ' + a));
    await muuu.balanceOf(userA).then((a) => console.log('user a wallet muuu: ' + a));
    console.log('claiming rewards...');
    var tx = await staker.getReward(userA, { from: userA });
    console.log('claimed A, gas: ' + tx.receipt.gasUsed);
    await kgl.balanceOf(staker.address).then((a) => console.log('kgl on staker: ' + a));
    console.log('======');
    await staker.earned(userA).then((a) => console.log('user a earned: ' + a));
    await kgl.balanceOf(userA).then((a) => console.log('user a wallet kgl: ' + a));
    await muuu.balanceOf(userA).then((a) => console.log('user a wallet muuu: ' + a));
    for (var i = 0; i < rewardCount; i++) {
      var rInfo = await staker.rewards(i);
      console.log('rewards ' + i + ': ' + JSON.stringify(rInfo));
    }

    await booster.earmarkRewards(24, { from: deployer });
    await time.increase(86400 * 5);
    await time.advanceBlock();
    console.log('\n\nadvance time...');
    console.log('======');
    await staker.earned(userA).then((a) => console.log('user a earned: ' + a));
    await kgl.balanceOf(userA).then((a) => console.log('user a wallet kgl: ' + a));
    await muuu.balanceOf(userA).then((a) => console.log('user a wallet muuu: ' + a));
    console.log('claiming rewards...');
    var tx = await staker.getReward(userA, { from: userA });
    console.log('claimed A, gas: ' + tx.receipt.gasUsed);
    await kgl.balanceOf(staker.address).then((a) => console.log('kgl on staker: ' + a));
    console.log('======');
    await staker.earned(userA).then((a) => console.log('user a earned: ' + a));
    await kgl.balanceOf(userA).then((a) => console.log('user a wallet kgl: ' + a));
    await muuu.balanceOf(userA).then((a) => console.log('user a wallet muuu: ' + a));
    for (var i = 0; i < rewardCount; i++) {
      var rInfo = await staker.rewards(i);
      console.log('rewards ' + i + ': ' + JSON.stringify(rInfo));
    }

    await booster.earmarkRewards(24, { from: deployer });
    await time.increase(86400 * 10);
    await time.advanceBlock();
    console.log('\n\nadvance time...');
    console.log('======');
    await staker.earned(userA).then((a) => console.log('user a earned: ' + a));
    await kgl.balanceOf(userA).then((a) => console.log('user a wallet kgl: ' + a));
    await muuu.balanceOf(userA).then((a) => console.log('user a wallet muuu: ' + a));
    console.log('claiming rewards...');
    var tx = await staker.getReward(userA, { from: userA });
    console.log('claimed A, gas: ' + tx.receipt.gasUsed);
    console.log('======');
    await staker.earned(userA).then((a) => console.log('user a earned: ' + a));
    await kgl.balanceOf(userA).then((a) => console.log('user a wallet kgl: ' + a));
    await muuu.balanceOf(userA).then((a) => console.log('user a wallet muuu: ' + a));

    await time.increase(86400);
    await time.advanceBlock();
    console.log('\n\nadvance time...');
    //withdraw
    console.log('withdrawing...');
    await staker.withdrawAndUnwrap(lpbalance, { from: userA });
    console.log('withdraw complete');

    console.log('claiming rewards...');
    var tx = await staker.getReward(userA, { from: userA });
    console.log('claimed A, gas: ' + tx.receipt.gasUsed);

    console.log('--- current rewards on wrapper ---');
    await kgl.balanceOf(staker.address).then((a) => console.log('staker kgl: ' + a));
    await muuu.balanceOf(staker.address).then((a) => console.log('staker muuu: ' + a));
    console.log('-----');
    await kgl.balanceOf(userA).then((a) => console.log('user a wallet kgl: ' + a));
    await muuu.balanceOf(userA).then((a) => console.log('user a wallet muuu: ' + a));
    await kaglatoken.balanceOf(userA).then((a) => console.log('user a wallet lptoken: ' + a));

    //check whats left on the staker
    console.log('>>> remaining check <<<<');
    await staker.balanceOf(userA).then((a) => console.log('user a staked: ' + a));
    await staker.balanceOf(userB).then((a) => console.log('user b staked: ' + a));
    await staker.totalSupply().then((a) => console.log('remaining supply: ' + a));
    await kgl.balanceOf(staker.address).then((a) => console.log('remaining kgl: ' + a));
    await muuu.balanceOf(staker.address).then((a) => console.log('remaining muuu: ' + a));
    // await stkaave.balanceOf(staker.address).then(a=>console.log("remaining stkaave: " +a));
  });
});
