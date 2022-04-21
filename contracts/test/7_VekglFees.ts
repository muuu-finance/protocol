const { time } = require('@openzeppelin/test-helpers')
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants')

const Booster = artifacts.require('Booster')
const KglDepositor = artifacts.require('KglDepositor')
const KaglaVoterProxy = artifacts.require('KaglaVoterProxy')
const BaseRewardPool = artifacts.require('BaseRewardPool')
const VirtualBalanceRewardPool = artifacts.require('VirtualBalanceRewardPool')
const MuKglToken = artifacts.require('MuKglToken')
const MuuuToken = artifacts.require('MuuuToken')
const RewardFactory = artifacts.require('RewardFactory')

// define mocks
const MockVotingEscrow = artifacts.require('MockKaglaVoteEscrow')
const MockMintableERC20 = artifacts.require('MintableERC20')
const MockRegistry = artifacts.require('MockKaglaRegistry')
const MockFeeDistributor = artifacts.require('MockKaglaFeeDistributor')
const MockAddressProvider = artifacts.require('MockKaglaAddressProvider')

const setupContracts = async () => {
  const votingEscrow = await MockVotingEscrow.new()

  const kglToken = await MockMintableERC20.new('Kagle Token', 'KGL', 18)
  const kaglaVoterProxy = await KaglaVoterProxy.new(
    kglToken.address,
    votingEscrow.address,
    ZERO_ADDRESS,
    ZERO_ADDRESS,
  )

  const muKglToken = await MuKglToken.new()

  const kglDepositor = await KglDepositor.new(
    kaglaVoterProxy.address,
    muKglToken.address,
    kglToken.address,
    votingEscrow.address,
  )

  // update config - set KglDepositor address
  await kaglaVoterProxy.setDepositor(kglDepositor.address)
  await muKglToken.setOperator(kglDepositor.address)
  // await kglDepositor.initialLock()

  // For Booster
  const threeKglToken = await MockMintableERC20.new(
    'Kagle USDC/USDT/DAI',
    '3Kgl',
    18,
  )
  const muuuToken = await MuuuToken.new()
  const booster = await Booster.new(
    kaglaVoterProxy.address,
    muuuToken.address,
    kglToken.address,
    (
      await MockAddressProvider.new(
        (
          await MockRegistry.new(
            ZERO_ADDRESS,
            ZERO_ADDRESS,
            threeKglToken.address,
          )
        ).address,
        (
          await MockFeeDistributor.new(threeKglToken.address)
        ).address,
      )
    ).address, // addressProvider.address
  )

  const rewardFactory = await RewardFactory.new(
    booster.address,
    kglToken.address,
  )
  const baseRewardPool = await BaseRewardPool.new(
    0,
    muKglToken.address,
    kglToken.address,
    booster.address,
    rewardFactory.address,
  )
  await booster.setFactories(rewardFactory.address, ZERO_ADDRESS, ZERO_ADDRESS)
  await booster.setRewardContracts(baseRewardPool.address, ZERO_ADDRESS)
  await booster.setFeeInfo()
  const virtualBalanceRewardPool = await VirtualBalanceRewardPool.at(
    await booster.lockFees(),
  )

  await kaglaVoterProxy.setOperator(booster.address)

  const veKglToken = await MockMintableERC20.new(
    'Vote-escrowed KGL',
    'veKGL',
    18,
  )

  return {
    kaglaVoterProxy,
    kglToken,
    muKglToken,
    veKglToken,
    kglDepositor,
    baseRewardPool,
    booster,
    threeKglToken,
    virtualBalanceRewardPool,
  }
}

contract('VeKgl Fees Test', async (accounts) => {
  it('should add to whitelist, lock kgl, test vekgl fee distribution', async () => {
    // let kgl = await IERC20.at('0xD533a949740bb3306d119CC777fa900bA034cd52')
    // let dai = await IERC20.at('0x6B175474E89094C44Da98b954EedeAC495271d0F')
    // let vekgl = await IERC20.at('0x5f3b5DfEb7B28CDbD7FAba78963EE202a494e2A2')
    // let threekgl = await IERC20.at('0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490')

    // //memo: these burner addresses may change
    // let burner = await IBurner.at('0xeCb456EA5365865EbAb8a2661B0c503410e9B347')
    // let underlyingburner = await IBurner.at(
    //   '0x786B374B5eef874279f4B7b4de16940e57301A58',
    // )
    // ///////

    // //system
    // let voteproxy = await KaglaVoterProxy.at(contractList.system.voteProxy)
    // let booster = await Booster.deployed()
    // let muKgl = await muKglToken.deployed()
    // let kglDeposit = await KglDepositor.deployed()
    // let muKglRewards = await booster.lockRewards()
    // let vekglRewards = await booster.lockFees()
    // let muKglRewardsContract = await BaseRewardPool.at(muKglRewards)
    // let vekglRewardsContract = await VirtualBalanceRewardPool.at(vekglRewards)

    const {
      kaglaVoterProxy: voteproxy,
      kglToken: kgl,
      muKglToken: muKgl,
      veKglToken: vekgl,
      kglDepositor: kglDeposit,
      baseRewardPool: muKglRewardsContract,
      booster,
      threeKglToken: threekgl,
      virtualBalanceRewardPool: vekglRewardsContract,
    } = await setupContracts()
    let userA = accounts[1]
    let caller = accounts[3]

    console.log(`current block time: ${await time.latest()}`)
    console.log(`current block: ${await time.latestBlock()}`)

    // //add to whitelist
    // await walletChecker.approveWallet(voteproxy.address, {
    //   from: checkerAdmin,
    //   gasPrice: 0,
    // })
    // console.log('approve wallet')
    // let isWhitelist = await walletChecker.check(voteproxy.address)
    // console.log('is whitelist? ' + isWhitelist)

    // //exchange for kgl
    // await weth.sendTransaction({
    //   value: web3.utils.toWei('1.0', 'ether'),
    //   from: userA,
    // })
    // let wethForKgl = await weth.balanceOf(userA)
    // await weth.approve(exchange.address, 0, { from: userA })
    // await weth.approve(exchange.address, wethForKgl, { from: userA })
    // await exchange.swapExactTokensForTokens(
    //   wethForKgl,
    //   0,
    //   [weth.address, kgl.address],
    //   userA,
    //   starttime + 3000,
    //   { from: userA },
    // )
    // let startingkgl = await kgl.balanceOf(userA)
    // console.log('kgl to deposit: ' + startingkgl)

    //deposit kgl and stake
    //  PREPARE
    await kgl.mint(50000, { from: userA })
    const startingkgl = await kgl.balanceOf(userA)
    //  EXECUTE
    await kgl.approve(kglDeposit.address, 0, { from: userA })
    await kgl.approve(kglDeposit.address, startingkgl, { from: userA })
    await kglDeposit.deposit(
      startingkgl,
      true,
      '0x0000000000000000000000000000000000000000',
      {
        from: userA,
      },
    )
    console.log('kgl deposited')
    console.log(`muKgl on wallet: ${await muKgl.balanceOf(userA)}`)
    console.log(`muKgl supply: ${await muKgl.totalSupply()}`)
    console.log(`depositor kgl(>0): ${await kgl.balanceOf(kglDeposit.address)}`)
    console.log(`proxy kgl(==0): ${await kgl.balanceOf(voteproxy.address)}`)
    console.log(`proxy veKgl(==0): ${await vekgl.balanceOf(voteproxy.address)}`)

    console.log('staking kgl')
    await muKgl.approve(muKglRewardsContract.address, 0, { from: userA })
    await muKgl.approve(muKglRewardsContract.address, startingkgl, {
      from: userA,
    })
    await muKglRewardsContract.stakeAll({ from: userA })
    console.log('staked')
    console.log(`muKgl on wallet: ${await muKgl.balanceOf(userA)}`)
    console.log(`muKgl staked: ${await muKglRewardsContract.balanceOf(userA)}`)

    //voting
    console.log('fee claiming...')

    //claim fees
    await booster.earmarkFees({ from: caller })
    console.log('fees earmarked')

    //reward contract balance (should be 0 still)
    console.log(
      `vekglRewardsContract balance: ${await threekgl.balanceOf(
        vekglRewardsContract.address,
      )}`,
    )

    //move forward about 2 weeks
    await time.increase(86400 * 15)
    await time.advanceBlock()
    console.log('advance time...')

    // --> skip operations to kgl contracts

    /// ----- burn fees to vekgl claim contracts (kagla dao side) ----
    // let burnerBalance = await threekgl.balanceOf(
    //   '0xA464e6DCda8AC41e03616F95f4BC98a13b8922Dc',
    // )
    // console.log('3kgl on burner: ' + burnerBalance)

    // await dai
    //   .balanceOf(burner.address)
    //   .then((a) => console.log('burner dai: ' + a))
    // //withdraw 3kgl fees
    // await burner.withdraw_admin_fees(
    //   '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7',
    // )
    // console.log('admin fees withdrawn from pool')
    // await dai
    //   .balanceOf(burner.address)
    //   .then((a) => console.log('burner dai: ' + a))
    // await dai
    //   .balanceOf(underlyingburner.address)
    //   .then((a) => console.log('dai on underlyingburner: ' + a))

    // //burn dai/usdt/usdc
    // await burner.burn(dai.address)
    // await burner.burn('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48')
    // await burner.burn('0xdAC17F958D2ee523a2206206994597C13D831ec7')
    // console.log('burnt single coins')

    // await dai
    //   .balanceOf(burner.address)
    //   .then((a) => console.log('burner dai: ' + a))
    // await dai
    //   .balanceOf(underlyingburner.address)
    //   .then((a) => console.log('dai on underlyingburner: ' + a))

    // //execute to wrap everything to 3kgl then send to "receiver" at 0xa464
    // await underlyingburner.execute()
    // console.log('burner executed')

    // //should be zero now that its transfered
    // await dai
    //   .balanceOf(burner.address)
    //   .then((a) => console.log('burner dai: ' + a))
    // await dai
    //   .balanceOf(underlyingburner.address)
    //   .then((a) => console.log('dai on underlyingburner: ' + a))
    // //burn 3kgl
    // await burner.burn(threekgl.address)
    // console.log('burn complete, checkpoit 3kgl')

    // let burnerBalance2 = await threekgl.balanceOf(
    //   '0xA464e6DCda8AC41e03616F95f4BC98a13b8922Dc',
    // )
    // console.log('3kgl on burner: ' + burnerBalance2)

    /// ----- burn to vekgl claim contract complete ----

    //claim fees for muuu platform
    await booster.earmarkFees()
    console.log('fees earmarked')

    //balance check (should be all in vekgl reward contract)
    console.log(
      `vekglRewardsContract balance: ${await threekgl.balanceOf(
        vekglRewardsContract.address,
      )}`,
    )
    console.log(
      `voteproxy balance(==0): ${await threekgl.balanceOf(voteproxy.address)}`,
    )
    console.log(
      `booster balance(==0): ${await threekgl.balanceOf(booster.address)}`,
    )

    //check earned
    console.log(`earned fees: ${await vekglRewardsContract.earned(userA)}`)

    //increase time
    await time.increase(86400)
    await time.advanceBlock()
    console.log('advance time...')
    //check earned
    console.log(`earned fees: ${await vekglRewardsContract.earned(userA)}`)

    //increase time
    await time.increase(86400)
    await time.advanceBlock()
    console.log('advance time...')

    //check earned
    console.log(`earned fees: ${await vekglRewardsContract.earned(userA)}`)

    //before balance
    console.log(`3kgl before claim: ${await threekgl.balanceOf(userA)}`)
    //get reward from main contract which will also claim from children contracts(kgl is main, vekgl fees is child)
    await muKglRewardsContract.getReward({ from: userA })
    console.log(`3kgl after claim: ${await threekgl.balanceOf(userA)}`)
  })
})
