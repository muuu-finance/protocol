const {
  BN,
  constants,
  expectEvent,
  expectRevert,
  time,
} = require('@openzeppelin/test-helpers')

var jsonfile = require('jsonfile')
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants')
var distroList = jsonfile.readFileSync('./migrations/distro.json')

const KaglaVoterProxy = artifacts.require('KaglaVoterProxy')
const VestedEscrow = artifacts.require('VestedEscrow')
const muuuRewardPool = artifacts.require('muuuRewardPool')
const MuuuToken = artifacts.require('MuuuToken')

const VotingEscrow = artifacts.require('MockKaglaVoteEscrow')
const MintableERC20 = artifacts.require('MintableERC20')

const setupContracts = async () => {
  const votingEscrow = await VotingEscrow.new()
  const kglToken = await MintableERC20.new('Kagle Token', 'KGL', 18)
  const kaglaVoterProxy = await KaglaVoterProxy.new(
    kglToken.address,
    votingEscrow.address,
    ZERO_ADDRESS,
    ZERO_ADDRESS,
  )
  const muuuToken = await MuuuToken.new(kaglaVoterProxy.address)
  const muuuRewards = await muuuRewardPool.new(
    muuuToken.address,
    kglToken.address,
    ZERO_ADDRESS, // kglDeposits
    ZERO_ADDRESS, // muKglRewards
    ZERO_ADDRESS, // muKglToken
    ZERO_ADDRESS, // operator
    ZERO_ADDRESS, // rewardManager
  )
  const rewardsStart = Math.floor(Date.now() / 1000) + 3600
  const rewardsEnd = rewardsStart + 1 * 364 * 86400
  const vestedEscrow = await VestedEscrow.new(
    muuuToken.address,
    rewardsStart,
    rewardsEnd,
    muuuRewards.address, // stakeContract
    ZERO_ADDRESS,
  )

  return {
    vestedEscrow,
    muuuToken,
    muuuRewards,
  }
}

contract('VestedEscrow Test', async (accounts) => {
  it('should claim unlock over time and claim', async () => {
    const {
      vestedEscrow: vested,
      muuuToken,
      muuuRewards,
    } = await setupContracts()

    // var team = distroList.vested.team.addresses
    // var investor = distroList.vested.investor.addresses
    // var treasury = distroList.vested.treasury.addresses
    // for (var i = 0; i < team.length; i++) {
    //   await vested
    //     .lockedOf(team[i])
    //     .then((a) => console.log(team[i] + ' locked: ' + a))
    //   await vested
    //     .balanceOf(team[i])
    //     .then((a) => console.log(team[i] + ' balance: ' + a))
    //   await vested
    //     .vestedOf(team[i])
    //     .then((a) => console.log(team[i] + ' vested: ' + a))
    // }
    // for (var i = 0; i < investor.length; i++) {
    //   await vested
    //     .lockedOf(investor[i])
    //     .then((a) => console.log(investor[i] + ' locked: ' + a))
    //   await vested
    //     .balanceOf(investor[i])
    //     .then((a) => console.log(investor[i] + ' balance: ' + a))
    //   await vested
    //     .vestedOf(investor[i])
    //     .then((a) => console.log(investor[i] + ' vested: ' + a))
    // }
    // for (var i = 0; i < treasury.length; i++) {
    //   await vested
    //     .lockedOf(treasury[i])
    //     .then((a) => console.log(treasury[i] + ' locked: ' + a))
    //   await vested
    //     .balanceOf(treasury[i])
    //     .then((a) => console.log(treasury[i] + ' balance: ' + a))
    //   await vested
    //     .vestedOf(treasury[i])
    //     .then((a) => console.log(treasury[i] + ' vested: ' + a))
    // }

    let accountA = accounts[1]
    let accountB = accounts[2]
    console.log(`accountA ... ${accountA}`)
    console.log(`accountB ... ${accountB}`)

    const eth = 1 * 10 ** 18
    // setup: 3 token, admin -> vested
    await muuuToken.approve(vested.address, (3 * eth).toString())
    await muuuToken.mint(accounts[0], (3 * eth).toString())
    await vested.addTokens((3 * eth).toString())
    // setup: fund - 1 token to A, 2 token to B
    await vested.fund(
      [accountA, accountB],
      [(1 * eth).toString(), (2 * eth).toString()],
    )

    for (var i = 0; i < 13; i++) {
      await time.increase(35 * 86400)
      await time.advanceBlock()
      await time.advanceBlock()
      await time.advanceBlock()
      await time.latest().then((a) => console.log('advance time...' + a))

      await vested
        .totalTime()
        .then((a) => console.log('vesting total time: ' + a))
      await vested
        .initialLockedSupply()
        .then((a) => console.log('vesting initialLockedSupply: ' + a))
      await vested
        .unallocatedSupply()
        .then((a) => console.log('vesting unallocatedSupply: ' + a))
      await vested
        .vestedSupply()
        .then((a) => console.log('vesting vestedSupply: ' + a))

      await vested
        .lockedOf(accountA)
        .then((a) => console.log('userA locked: ' + a))
      await vested
        .balanceOf(accountA)
        .then((a) => console.log('userA balance: ' + a))
      await vested
        .vestedOf(accountA)
        .then((a) => console.log('userA vested: ' + a))

      await vested
        .lockedOf(accountB)
        .then((a) => console.log('userB locked: ' + a))
      await vested
        .balanceOf(accountB)
        .then((a) => console.log('userB balance: ' + a))
      await vested
        .vestedOf(accountB)
        .then((a) => console.log('userB vested: ' + a))
    }

    await vested.claim(accountA)
    await muuuToken
      .balanceOf(accountA)
      .then((a) => console.log('User A muuu in wallet: ' + a))

    await vested.claimAndStake({ from: accountB })
    await muuuRewards
      .balanceOf(accountB)
      .then((a) => console.log('User B muuu staked: ' + a))
  })
})
