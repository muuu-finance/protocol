const { BN, constants, expectEvent, expectRevert, time } = require('@openzeppelin/test-helpers');

const MerkleTree = require('./helpers/merkleTree');
var jsonfile = require('jsonfile');
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants');
var droplist = jsonfile.readFileSync('../airdrop/drop_proofs.json');
var contractList = jsonfile.readFileSync('./contracts.json');
var distroList = jsonfile.readFileSync('./migrations/distro.json');

const KaglaVoterProxy = artifacts.require('KaglaVoterProxy');
const VestedEscrow = artifacts.require('VestedEscrow');
const cvxRewardPool = artifacts.require('cvxRewardPool');
const MuuuToken = artifacts.require('MuuuToken');

const VotingEscrow = artifacts.require('MockKaglaVoteEscrow');

contract('VestedEscrow Test', async (accounts) => {
  it('should claim unlock over time and claim', async () => {
    //system
    const votingEscrow = await VotingEscrow.new();
    const kaglaVoterProxy = await KaglaVoterProxy.new(votingEscrow.address);
    const cvx = await MuuuToken.new(kaglaVoterProxy.address);
    let cvxRewards = await cvxRewardPool.new(
      cvx.address,
      ZERO_ADDRESS,
      ZERO_ADDRESS,
      ZERO_ADDRESS,
      ZERO_ADDRESS,
      ZERO_ADDRESS,
      ZERO_ADDRESS
    );
    const rewardsStart = Math.floor(Date.now() / 1000) + 3600;
    const rewardsEnd = rewardsStart + 1 * 364 * 86400;
    let vested = await VestedEscrow.new(
      cvx.address,
      rewardsStart,
      rewardsEnd,
      ZERO_ADDRESS,
      ZERO_ADDRESS
    );

    var team = distroList.vested.team.addresses;
    var investor = distroList.vested.investor.addresses;
    var treasury = distroList.vested.treasury.addresses;
    for (var i = 0; i < team.length; i++) {
      await vested.lockedOf(team[i]).then((a) => console.log(team[i] + ' locked: ' + a));
      await vested.balanceOf(team[i]).then((a) => console.log(team[i] + ' balance: ' + a));
      await vested.vestedOf(team[i]).then((a) => console.log(team[i] + ' vested: ' + a));
    }
    for (var i = 0; i < investor.length; i++) {
      await vested.lockedOf(investor[i]).then((a) => console.log(investor[i] + ' locked: ' + a));
      await vested.balanceOf(investor[i]).then((a) => console.log(investor[i] + ' balance: ' + a));
      await vested.vestedOf(investor[i]).then((a) => console.log(investor[i] + ' vested: ' + a));
    }
    for (var i = 0; i < treasury.length; i++) {
      await vested.lockedOf(treasury[i]).then((a) => console.log(treasury[i] + ' locked: ' + a));
      await vested.balanceOf(treasury[i]).then((a) => console.log(treasury[i] + ' balance: ' + a));
      await vested.vestedOf(treasury[i]).then((a) => console.log(treasury[i] + ' vested: ' + a));
    }

    let accountA = '0xAAc0aa431c237C2C0B5f041c8e59B3f1a43aC78F';
    let accountB = '0xb3DF5271b92e9fD2fed137253BB4611285923f16';
    for (var i = 0; i < 13; i++) {
      // await time.increase(35*86400);
      // await time.advanceBlock();
      // await time.advanceBlock();
      // await time.advanceBlock();
      // await time.latest().then(a=>console.log("advance time..."+a));
      // refs
      // - https://stackoverflow.com/questions/70650263/testing-contracts-using-time-from-openzepplin-library-error-invalid-json-rpc-r
      // - https://forum.openzeppelin.com/t/invalid-json-rpc-response-when-using-test-helpers-expectrevert-openzeppelin-test-environment/4422

      await vested.totalTime().then((a) => console.log('vesting total time: ' + a));
      await vested
        .initialLockedSupply()
        .then((a) => console.log('vesting initialLockedSupply: ' + a));
      await vested.unallocatedSupply().then((a) => console.log('vesting unallocatedSupply: ' + a));
      await vested.vestedSupply().then((a) => console.log('vesting vestedSupply: ' + a));

      await vested.lockedOf(accountA).then((a) => console.log('userA locked: ' + a));
      await vested.balanceOf(accountA).then((a) => console.log('userA balance: ' + a));
      await vested.vestedOf(accountA).then((a) => console.log('userA vested: ' + a));

      await vested.lockedOf(accountB).then((a) => console.log('userB locked: ' + a));
      await vested.balanceOf(accountB).then((a) => console.log('userB balance: ' + a));
      await vested.vestedOf(accountB).then((a) => console.log('userB vested: ' + a));
    }

    await vested.claim(accountA);
    await cvx.balanceOf(accountA).then((a) => console.log('User A cvx in wallet: ' + a));

    // await vested.claimAndStake({from:accountB}) // because not setting token
    await cvxRewards.balanceOf(accountB).then((a) => console.log('User B cvx staked: ' + a));
  });
});
