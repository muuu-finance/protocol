// const { BN, constants, expectEvent, expectRevert, time } = require('@openzeppelin/test-helpers');
const { BN, time } = require('@openzeppelin/test-helpers');
var jsonfile = require('jsonfile');
var contractList = jsonfile.readFileSync('./contracts.json');

const Booster = artifacts.require('Booster');
const KglDepositor = artifacts.require('KglDepositor');
const MuuuToken = artifacts.require('MuuuToken');
const muKglToken = artifacts.require('muKglToken');
const KaglaVoterProxy = artifacts.require('KaglaVoterProxy');
const BaseRewardPool = artifacts.require('BaseRewardPool');
const MuuuStakingWrapper = artifacts.require('MuuuStakingWrapper');
const IERC20 = artifacts.require('IERC20');
const IKaglaAavePool = artifacts.require('IKaglaAavePool');
const IExchange = artifacts.require('IExchange');
const IUniswapV2Router01 = artifacts.require('IUniswapV2Router01');
const MuuuMining = artifacts.require('MuuuMining');
const MuuuStakingWrapperAbra = artifacts.require('MuuuStakingWrapperAbra');
const ProxyFactory = artifacts.require('ProxyFactory');

contract('Deploy stake wrapper', async (accounts) => {
  it('should deploy contracts', async () => {
    let deployer = '0x947B7742C403f20e5FaCcDAc5E092C943E7D0277';
    let multisig = '0xa3C5A1e09150B75ff251c1a7815A07182c3de2FB';
    let addressZero = '0x0000000000000000000000000000000000000000';

    //system
    let booster = await Booster.at(contractList.system.booster);
    let voteproxy = await KaglaVoterProxy.at(contractList.system.voteProxy);
    let muuu = await MuuuToken.at(contractList.system.muuu);
    let kgl = await IERC20.at('0xD533a949740bb3306d119CC777fa900bA034cd52');
    let stkaave = await IERC20.at('0x4da27a545c0c5B758a6BA100e3a049001de870f5');
    let muKgl = await muKglToken.at(contractList.system.muKgl);
    let muKglLP = await IERC20.at(contractList.system.muKglKglSLP);
    let exchange = await IExchange.at('0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F');
    let exchangerouter = await IUniswapV2Router01.at('0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F');
    let weth = await IERC20.at('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2');
    let kaglaAave = await IERC20.at('0xFd2a8fA60Abd58Efe3EeE34dd494cD491dC14900');
    let muuuAave = await IERC20.at('0x23F224C37C3A69A058d86a54D3f561295A93d542');
    let aavepool = 24;
    let aaveswap = await IKaglaAavePool.at('0xDeBF20617708857ebe4F679508E7b7863a8A8EeE');
    let muuuAaveRewards = await BaseRewardPool.at('0xE82c1eB4BC6F92f85BF7EB6421ab3b882C3F5a7B');
    let dai = await IERC20.at('0x6B175474E89094C44Da98b954EedeAC495271d0F');

    //master deploy
    // let lib = await MuuuMining.at(contractList.system.muuuMining);
    // console.log("mining lib at: " +lib.address);
    // await MuuuStakingWrapperAbra.link("MuuuMining", lib.address);

    // let master = await MuuuStakingWrapperAbra.new();
    // console.log("master abra wrapper: " +master.address);
    // return;

    //clone deploy
    // let cloneName = "ren";
    // let cloneName = "tricrypto2";
    let cloneName = 'alusd';

    let pfactory = await ProxyFactory.at(contractList.system.proxyFactory);
    let clone = await pfactory.clone.call(contractList.system.masterAbraWrapper);
    console.log('clone: ' + clone);
    let clonetx = await pfactory.clone(contractList.system.masterAbraWrapper);

    let staker = await MuuuStakingWrapperAbra.at(clone);
    let pool = contractList.pools.find((a) => a.name == cloneName);
    await staker.initialize(pool.lptoken, pool.token, pool.kglRewards, pool.id, addressZero);
    console.log('staker token: ' + staker.address);
    await staker.name().then((a) => console.log('name: ' + a));
    await staker.symbol().then((a) => console.log('symbol: ' + a));
    await staker.kaglaToken().then((a) => console.log('kagla token: ' + a));
    await staker.muuuToken().then((a) => console.log('muuu token: ' + a));
    await staker.muuuPoolId().then((a) => console.log('muuu poolId: ' + a));

    return;
  });
});
