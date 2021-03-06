// const { BN, constants, expectEvent, expectRevert, time } = require('@openzeppelin/test-helpers');
const { BN, time } = require('@openzeppelin/test-helpers')
var jsonfile = require('jsonfile')
var contractList = jsonfile.readFileSync('./contracts.json')

const Booster = artifacts.require('Booster')
const KglDepositor = artifacts.require('KglDepositor')
const MuuuToken = artifacts.require('MuuuToken')
const muKglToken = artifacts.require('MuKglToken')
const KaglaVoterProxy = artifacts.require('KaglaVoterProxy')
const BaseRewardPool = artifacts.require('BaseRewardPool')
const MuKglStakingWrapper = artifacts.require('MuKglStakingWrapper')
const IERC20 = artifacts.require('IERC20')
const IKaglaAavePool = artifacts.require('IKaglaAavePool')
const IExchange = artifacts.require('IExchange')
const IUniswapV2Router01 = artifacts.require('IUniswapV2Router01')
const MuuuMining = artifacts.require('MuuuMining')
const MuKglRari = artifacts.require('MuKglRari')

contract('Test mukgl stake wrapper', async (accounts) => {
  it('should deposit mukgl and earn rewards while being transferable', async () => {
    let deployer = '0x947B7742C403f20e5FaCcDAc5E092C943E7D0277'
    let multisig = '0xa3C5A1e09150B75ff251c1a7815A07182c3de2FB'
    let addressZero = '0x0000000000000000000000000000000000000000'

    //system
    let booster = await Booster.at(contractList.system.booster)
    let voteproxy = await KaglaVoterProxy.at(contractList.system.voteProxy)
    let kglDeposit = await KglDepositor.at(contractList.system.kglDepositor)
    let muuu = await MuuuToken.at(contractList.system.muuu)
    let kgl = await IERC20.at('0xD533a949740bb3306d119CC777fa900bA034cd52')
    let threeKgl = await IERC20.at('0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490')
    let muKgl = await muKglToken.at(contractList.system.muKgl)
    let muKglLP = await IERC20.at(contractList.system.muKglKglSLP)
    let exchange = await IExchange.at(
      '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
    )
    let exchangerouter = await IUniswapV2Router01.at(
      '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
    )
    let weth = await IERC20.at('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2')
    let kaglaAave = await IERC20.at(
      '0xFd2a8fA60Abd58Efe3EeE34dd494cD491dC14900',
    )
    let muuuAave = await IERC20.at('0x23F224C37C3A69A058d86a54D3f561295A93d542')
    let aavepool = 24
    let aaveswap = await IKaglaAavePool.at(
      '0xDeBF20617708857ebe4F679508E7b7863a8A8EeE',
    )
    let muuuAaveRewards = await BaseRewardPool.at(
      '0xE82c1eB4BC6F92f85BF7EB6421ab3b882C3F5a7B',
    )
    let dai = await IERC20.at('0x6B175474E89094C44Da98b954EedeAC495271d0F')

    let userA = accounts[0]
    let userB = accounts[1]
    let userC = accounts[2]

    let starttime = await time.latest()
    await weth.sendTransaction({
      value: web3.utils.toWei('10.0', 'ether'),
      from: deployer,
    })
    var wethBalance = await weth.balanceOf(deployer)
    console.log('receive weth: ' + wethBalance)
    await weth.approve(exchange.address, wethBalance, { from: deployer })
    await exchange.swapExactTokensForTokens(
      web3.utils.toWei('10.0', 'ether'),
      0,
      [weth.address, kgl.address],
      deployer,
      starttime + 3000,
      { from: deployer },
    )
    var kglbalance = await kgl.balanceOf(deployer)
    console.log('swapped for kgl: ' + kglbalance)

    // await kgl.approve(kglDeposit.address,kglbalance,{from:deployer});
    // console.log("approved");
    // await kglDeposit.deposit(kglbalance,false,addressZero,{from:deployer});
    // console.log("kgl deposited");
    var kglbalance = await kgl.balanceOf(deployer)
    console.log('kglbalance: ' + kglbalance)

    var touserB = kglbalance.div(new BN('3'))
    await kgl.transfer(userB, touserB, { from: deployer })
    kglbalance = await kgl.balanceOf(deployer)
    await kgl.transfer(userA, kglbalance, { from: deployer })
    var userABalance = await kgl.balanceOf(userA)
    var userBBalance = await kgl.balanceOf(userB)
    console.log('userA: ' + userABalance + ',  userB: ' + userBBalance)

    let lib = await MuuuMining.new()
    console.log('mining lib at: ' + lib.address)
    await MuKglStakingWrapper.link('MuuuMining', lib.address)
    let staker = await MuKglStakingWrapper.new({ from: deployer })
    await staker.initialize(addressZero, { from: deployer })
    // let staker = await MuKglRari.new(addressZero,{from:deployer});
    console.log('staker token: ' + staker.address)

    await staker.name().then((a) => console.log('name: ' + a))
    await staker.symbol().then((a) => console.log('symbol: ' + a))
    // await staker.setApprovals();
    // await staker.addRewards({from:deployer});

    let rewardCount = await staker.rewardLength()
    for (var i = 0; i < rewardCount; i++) {
      var rInfo = await staker.rewards(i)
      console.log('rewards ' + i + ': ' + JSON.stringify(rInfo))
    }

    //user A will deposit kagla tokens and user B muuu
    await kgl.approve(staker.address, userABalance, { from: userA })
    await kgl.approve(kglDeposit.address, userBBalance, { from: userB })
    await muKgl.approve(staker.address, userBBalance, { from: userB })
    console.log('approved booster and staker')
    await kglDeposit.deposit(userBBalance, false, addressZero, { from: userB })
    console.log('deposited into muuu for user b')

    var depositTx = await staker.deposit(userABalance, userA, { from: userA })
    console.log('user A deposited, gas: ' + depositTx.receipt.gasUsed)
    await muKgl.balanceOf(userB).then((a) => console.log('user b muKgl: ' + a))
    var stakeTx = await staker.stake(userBBalance, userB, { from: userB })
    console.log('user b staked, gas: ' + stakeTx.receipt.gasUsed)
    await staker.totalSupply().then((a) => console.log('staker supply: ' + a))

    await staker.balanceOf(userA).then((a) => console.log('user a: ' + a))
    await staker.balanceOf(userB).then((a) => console.log('user b: ' + a))

    await staker.earned(userA).then((a) => console.log('user a earned: ' + a))
    await staker.earned(userB).then((a) => console.log('user b earned: ' + a))

    await time.increase(86400)
    await time.advanceBlock()
    console.log('advance time...')

    console.log('======')
    await staker.earned(userA).then((a) => console.log('user a earned: ' + a))
    await kgl
      .balanceOf(userA)
      .then((a) => console.log('user a wallet kgl: ' + a))
    await muuu
      .balanceOf(userA)
      .then((a) => console.log('user a wallet muuu: ' + a))
    await threeKgl
      .balanceOf(userA)
      .then((a) => console.log('user a wallet threeKgl: ' + a))
    console.log('-----')
    await staker.earned(userB).then((a) => console.log('user b earned: ' + a))
    await kgl
      .balanceOf(userB)
      .then((a) => console.log('user b wallet kgl: ' + a))
    await muuu
      .balanceOf(userB)
      .then((a) => console.log('user b wallet muuu: ' + a))
    await threeKgl
      .balanceOf(userB)
      .then((a) => console.log('user b wallet threeKgl: ' + a))

    console.log('checkpoint')
    await staker.user_checkpoint([userA, addressZero])
    await staker.user_checkpoint([userB, addressZero])
    await kgl
      .balanceOf(staker.address)
      .then((a) => console.log('staker kgl: ' + a))
    await muuu
      .balanceOf(staker.address)
      .then((a) => console.log('staker muuu: ' + a))
    await threeKgl
      .balanceOf(staker.address)
      .then((a) => console.log('staker threeKgl: ' + a))
    for (var i = 0; i < rewardCount; i++) {
      var rInfo = await staker.rewards(i)
      console.log('rewards ' + i + ': ' + JSON.stringify(rInfo))
    }

    console.log('======')
    await staker.earned(userA).then((a) => console.log('user a earned: ' + a))
    await kgl
      .balanceOf(userA)
      .then((a) => console.log('user a wallet kgl: ' + a))
    await muuu
      .balanceOf(userA)
      .then((a) => console.log('user a wallet muuu: ' + a))
    await threeKgl
      .balanceOf(userA)
      .then((a) => console.log('user a wallet threeKgl: ' + a))
    console.log('-----')
    await staker.earned(userB).then((a) => console.log('user b earned: ' + a))
    await kgl
      .balanceOf(userB)
      .then((a) => console.log('user b wallet kgl: ' + a))
    await muuu
      .balanceOf(userB)
      .then((a) => console.log('user b wallet muuu: ' + a))
    await threeKgl
      .balanceOf(userB)
      .then((a) => console.log('user b wallet threeKgl: ' + a))

    //test transfering to account C
    await staker.transfer(userC, userBBalance, { from: userB })
    console.log('transfer to userC')
    await staker.earned(userB).then((a) => console.log('user b earned: ' + a))
    await kgl
      .balanceOf(userB)
      .then((a) => console.log('user b wallet kgl: ' + a))
    await muuu
      .balanceOf(userB)
      .then((a) => console.log('user b wallet muuu: ' + a))
    await threeKgl
      .balanceOf(userB)
      .then((a) => console.log('user b wallet threeKgl: ' + a))
    console.log('-----')
    await staker.earned(userC).then((a) => console.log('user c earned: ' + a))
    await kgl
      .balanceOf(userC)
      .then((a) => console.log('user c wallet kgl: ' + a))
    await muuu
      .balanceOf(userC)
      .then((a) => console.log('user c wallet muuu: ' + a))
    await threeKgl
      .balanceOf(userC)
      .then((a) => console.log('user c wallet threeKgl: ' + a))

    await time.increase(86400)
    await time.advanceBlock()
    console.log('\nadvance time...\n')

    await staker.earned(userB).then((a) => console.log('user b earned: ' + a))
    await kgl
      .balanceOf(userB)
      .then((a) => console.log('user b wallet kgl: ' + a))
    await muuu
      .balanceOf(userB)
      .then((a) => console.log('user b wallet muuu: ' + a))
    await threeKgl
      .balanceOf(userB)
      .then((a) => console.log('user b wallet threeKgl: ' + a))
    console.log('-----')
    await staker.earned(userC).then((a) => console.log('user c earned: ' + a))
    await kgl
      .balanceOf(userC)
      .then((a) => console.log('user c wallet kgl: ' + a))
    await muuu
      .balanceOf(userC)
      .then((a) => console.log('user c wallet muuu: ' + a))
    await threeKgl
      .balanceOf(userC)
      .then((a) => console.log('user c wallet threeKgl: ' + a))

    //withdraw
    console.log('withdrawing...')
    await staker.withdraw(userABalance, { from: userA })
    await staker.withdraw(0, { from: userB })
    await staker.withdraw(userBBalance, { from: userC })
    var getRewardTx = await staker.getReward(userA, { from: userA })
    await staker.getReward(userB, { from: userB })
    await staker.getReward(userC, { from: userC })
    console.log('withdrew and claimed all, gas: ' + getRewardTx.receipt.gasUsed)

    console.log('try claim again')
    await staker.getReward(userC, { from: userC })

    await staker.earned(userA).then((a) => console.log('user a earned: ' + a))
    await kgl
      .balanceOf(userA)
      .then((a) => console.log('user a wallet kgl: ' + a))
    await muuu
      .balanceOf(userA)
      .then((a) => console.log('user a wallet muuu: ' + a))
    await threeKgl
      .balanceOf(userA)
      .then((a) => console.log('user a wallet threeKgl: ' + a))
    console.log('-----')
    await staker.earned(userB).then((a) => console.log('user b earned: ' + a))
    await kgl
      .balanceOf(userB)
      .then((a) => console.log('user b wallet kgl: ' + a))
    await muuu
      .balanceOf(userB)
      .then((a) => console.log('user b wallet muuu: ' + a))
    await threeKgl
      .balanceOf(userB)
      .then((a) => console.log('user b wallet threeKgl: ' + a))
    console.log('-----')
    await staker.earned(userC).then((a) => console.log('user c earned: ' + a))
    await kgl
      .balanceOf(userC)
      .then((a) => console.log('user c wallet kgl: ' + a))
    await muuu
      .balanceOf(userC)
      .then((a) => console.log('user c wallet muuu: ' + a))
    await threeKgl
      .balanceOf(userC)
      .then((a) => console.log('user c wallet threeKgl: ' + a))

    //check whats left on the staker
    console.log('>>> remaining check <<<<')
    await staker
      .balanceOf(userA)
      .then((a) => console.log('user a staked: ' + a))
    await staker
      .balanceOf(userB)
      .then((a) => console.log('user b staked: ' + a))
    await staker
      .balanceOf(userC)
      .then((a) => console.log('user c staked: ' + a))
    await staker
      .totalSupply()
      .then((a) => console.log('remaining supply: ' + a))
    await kgl
      .balanceOf(staker.address)
      .then((a) => console.log('remaining kgl: ' + a))
    await muuu
      .balanceOf(staker.address)
      .then((a) => console.log('remaining muuu: ' + a))
    await threeKgl
      .balanceOf(staker.address)
      .then((a) => console.log('remaining threeKgl: ' + a))
  })
})
