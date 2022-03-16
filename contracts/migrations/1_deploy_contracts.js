const { time } = require('@openzeppelin/test-helpers');
var fs = require('fs');
var jsonfile = require('jsonfile');
var BN = require('big-number');
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants');
var distroList = jsonfile.readFileSync('./distro.json');

const Booster = artifacts.require('Booster');
const CurveVoterProxy = artifacts.require('CurveVoterProxy');
const RewardFactory = artifacts.require('RewardFactory');
const StashFactory = artifacts.require('StashFactory');
const TokenFactory = artifacts.require('TokenFactory');
const ConvexToken = artifacts.require('ConvexToken');
const cvxCrvToken = artifacts.require('cvxCrvToken');
const CrvDepositor = artifacts.require('CrvDepositor');
const PoolManager = artifacts.require('PoolManager');
const BaseRewardPool = artifacts.require('BaseRewardPool');
const cvxRewardPool = artifacts.require('cvxRewardPool');
const ArbitratorVault = artifacts.require('ArbitratorVault');
const ClaimZap = artifacts.require('ClaimZap');
const ConvexMasterChef = artifacts.require('ConvexMasterChef');
const VestedEscrow = artifacts.require('VestedEscrow');
const MerkleAirdrop = artifacts.require('MerkleAirdrop');
const MerkleAirdropFactory = artifacts.require('MerkleAirdropFactory');
const MintableERC20 = artifacts.require('MintableERC20');
const MockVotingEscrow = artifacts.require('MockCurveVoteEscrow');

const CvxLockerV2 = artifacts.require('CvxLockerV2');

module.exports = function (deployer, network, accounts) {
  if (network === 'skipMigration') {
    console.log(`Skip migration in ${network} network`);
    return;
  }
  // you need to prepare curveVoterProxy beforehand
  // const convexVoterProxy = "0xE7FDdA2a4Ba464A9F11a54A62B378E79c94d8332";

  // tmp: team account
  const treasuryAddress = '0xCdfc500F7f0FCe1278aECb0340b523cD55b3EBbb';

  // TODO: invetigate the purpose of this
  const merkleRoot = '0x632a2ad201c5b95d3f75c1332afdcf489d4e6b4b7480cf878d8eba2aa87d5f73';

  // TODO: replace this with mock token addrress
  // const crv = "0xD533a949740bb3306d119CC777fa900bA034cd52";

  let admin = accounts[0];
  console.log('deploying from: ' + admin);
  var premine = new BN(0);
  premine.add(distroList.lpincentives);
  premine.add(distroList.vecrv);
  premine.add(distroList.teamcvxLpSeed);
  var vestedAddresses = distroList.vested.team.addresses.concat(
    distroList.vested.investor.addresses,
    distroList.vested.treasury.addresses
  );
  // console.log("vested addresses: " +vestedAddresses.toString())
  var vestedAmounts = distroList.vested.team.amounts.concat(
    distroList.vested.investor.amounts,
    distroList.vested.treasury.amounts
  );
  //console.log("vested amounts: " +vestedAmounts.toString())
  var totalVested = new BN(0);
  for (var i in vestedAmounts) {
    totalVested.add(vestedAmounts[i]);
  }
  console.log('total vested: ' + totalVested.toString());
  premine.add(totalVested);
  console.log('total cvx premine: ' + premine.toString());
  var totaldistro = new BN(premine).add(distroList.miningRewards);
  console.log('total cvx: ' + totaldistro.toString());

  var booster, voter, rFactory, sFactory, tFactory, cvx, cvxCrv, deposit, arb, pools;
  var crvToken;
  var cvxCrvRewards, cvxRewards, airdrop, vesting;
  var pairToken;
  var crvdepositAmt, crvbal, cvxCrvBal;
  var crv, weth, dai;
  var convexVoterProxy;
  var cvxLockerV2;

  let mockVotingEscrow;

  var rewardsStart = Math.floor(Date.now() / 1000) + 3600;
  var rewardsEnd = rewardsStart + 1 * 364 * 86400;

  var contractList = {};
  var systemContracts = {};
  var poolsContracts = [];
  var poolNames = [];
  contractList['system'] = systemContracts;
  contractList['pools'] = poolsContracts;
  contractList['mocks'] = {};

  var addContract = function (group, name, value) {
    contractList[group][name] = value;
    var contractListOutput = JSON.stringify(contractList, null, 4);
    fs.writeFileSync('contracts.json', contractListOutput, function (err) {
      if (err) {
        return console.log('Error writing file: ' + err);
      }
    });
  };

  // addContract("system","voteProxy",convexVoterProxy);
  addContract('system', 'treasury', treasuryAddress);

  deployer
    // ========================== Preparation start ==========================
    .deploy(MintableERC20, 'crv', 'CRV', 18)
    .then(function (instance) {
      crv = instance;
      addContract('mocks', 'CRV', crv.address);
    })
    .then(function () {
      return deployer.deploy(MintableERC20, 'weth', 'WETH', 18);
    })
    .then(function (instance) {
      weth = instance;
      addContract('mocks', 'WETH', weth.address);
    })
    .then(function () {
      return deployer.deploy(MintableERC20, 'dai', 'DAI', 18);
    })
    .then(function (instance) {
      dai = instance;
      addContract('mocks', 'DAI', dai.address);
    })
    .then(function () {
      return deployer.deploy(MockVotingEscrow);
    })
    .then(function (instance) {
      mockVotingEscrow = instance;
      addContract('mocks', 'mockVotingEscrow', mockVotingEscrow.address);
    })
    .then(function () {
      return deployer.deploy(
        CurveVoterProxy,
        crv.address,
        mockVotingEscrow.address,
        ZERO_ADDRESS, // TODO:
        ZERO_ADDRESS // TODO:
      );
    })
    .then(function (instance) {
      voter = instance;
      addContract('system', 'voteProxy', voter.address);
    })
    // ========================== Preparation end ==========================
    .then(function () {
      return deployer.deploy(ConvexToken, voter.address);
    })
    .then(function (instance) {
      cvx = instance;
      addContract('system', 'cvx', cvx.address);
    })
    .then(function () {
      return deployer.deploy(Booster, voter.address, cvx.address, crv.address);
    })
    .then(function (instance) {
      booster = instance;
      addContract('system', 'booster', booster.address);
      return voter.owner();
    })
    .then(function (currentOwner) {
      //if develop, change current owner to current deployer
      if (currentOwner != admin) {
        return voter.transferOwnership(admin, { from: currentOwner });
      }
    })
    .then(function () {
      return voter.setOperator(booster.address);
    })
    .then(function () {
      return cvx.mint(accounts[0], premine.toString());
    })
    .then(function () {
      return deployer.deploy(RewardFactory, booster.address);
    })
    .then(function (instance) {
      rFactory = instance;
      addContract('system', 'rFactory', rFactory.address);
    })
    .then(function () {
      return deployer.deploy(TokenFactory, booster.address);
    })
    .then(function (instance) {
      tFactory = instance;
      addContract('system', 'tFactory', tFactory.address);
      return deployer.deploy(StashFactory, booster.address, rFactory.address);
    })
    .then(function (instance) {
      sFactory = instance;
      addContract('system', 'sFactory', sFactory.address);
      return deployer.deploy(cvxCrvToken);
    })
    .then(function (instance) {
      cvxCrv = instance;
      addContract('system', 'cvxCrv', cvxCrv.address);
      return deployer.deploy(
        CrvDepositor,
        voter.address,
        cvxCrv.address,
        crv.address,
        mockVotingEscrow.address // TODO: replace
      );
    })
    .then(function (instance) {
      deposit = instance;
      addContract('system', 'crvDepositor', deposit.address);
      return cvxCrv.setOperator(deposit.address);
    })
    .then(function () {
      return voter.setDepositor(deposit.address);
    })
    .then(function () {
      return deposit.initialLock();
    })
    .then(function () {
      return booster.setTreasury(deposit.address);
    })
    .then(function () {
      return deployer.deploy(
        BaseRewardPool,
        0,
        cvxCrv.address,
        crv.address,
        booster.address,
        rFactory.address
      );
    })
    .then(function (instance) {
      cvxCrvRewards = instance;
      addContract('system', 'cvxCrvRewards', cvxCrvRewards.address);
      // reward manager is admin to add any new incentive programs
      return deployer.deploy(
        cvxRewardPool,
        cvx.address,
        crv.address,
        deposit.address,
        cvxCrvRewards.address,
        cvxCrv.address,
        booster.address,
        admin
      );
    })
    .then(function (instance) {
      cvxRewards = instance;
      addContract('system', 'cvxRewards', cvxRewards.address);
      return booster.setRewardContracts(cvxCrvRewards.address, cvxRewards.address);
    })
    .then(function () {
      return deployer.deploy(PoolManager, booster.address);
    })
    .then(function (instance) {
      pools = instance;
      addContract('system', 'poolManager', pools.address);
      return booster.setPoolManager(pools.address);
    })
    .then(function () {
      return booster.setFactories(rFactory.address, sFactory.address, tFactory.address);
    })
    .then(function () {
      //  TODO:
      // return booster.setFeeInfo();
    })
    .then(function () {
      return deployer.deploy(ArbitratorVault, booster.address);
    })
    .then(function (instance) {
      arb = instance;
      addContract('system', 'arbitratorVault', arb.address);
      return booster.setArbitrator(arb.address);
    })

    // added CVX LockerV2 ref: /contracts/test/UI_7_DeployLockerV2.js
    .then(function () {
      // TODO: constructor
      return deployer.deploy(CvxLockerV2);
    })
    .then(function (instance) {
      cvxLockerV2 = instance;
      addContract('system', 'cvxLockerV2', cvxLockerV2.address);
    })

    .then(function () {
      return deployer.deploy(
        ClaimZap,
        crv.address,
        cvx.address,
        cvxCrv.address,
        deposit.address,
        cvxCrvRewards.address,
        cvxRewards.address,
        treasuryAddress, // TODO: replace. this is supposed to be Factory cvxCRV in curve
        cvxLockerV2.address
      );
    })
    .then(function (instance) {
      addContract('system', 'claimZap', instance.address);
      return instance.setApprovals();
    })

    //Fund vested escrow
    .then(function () {
      //vest team, invest, treasury
      return deployer.deploy(
        VestedEscrow,
        cvx.address,
        rewardsStart,
        rewardsEnd,
        cvxRewards.address,
        admin
      );
    })
    .then(function (instance) {
      vesting = instance;
      addContract('system', 'vestedEscrow', vesting.address);
      return cvx.approve(vesting.address, distroList.vested.total);
    })
    .then(function () {
      return vesting.addTokens(distroList.vested.total);
    })
    .then(function () {
      return vesting.fund(vestedAddresses, vestedAmounts);
    })
    .then(function () {
      return vesting.unallocatedSupply();
    })
    .then(function (unallocatedSupply) {
      console.log('vesting unallocatedSupply: ' + unallocatedSupply);
      return vesting.initialLockedSupply();
    })
    .then(function (initialLockedSupply) {
      console.log('vesting initialLockedSupply: ' + initialLockedSupply);
    })
    .then(function () {
      return deployer.deploy(MerkleAirdropFactory);
    })
    .then(function (dropFactory) {
      addContract('system', 'dropFactory', dropFactory.address);
      return dropFactory.CreateMerkleAirdrop();
    })
    .then(function (tx) {
      console.log('factory return: ' + tx.logs[0].args.drop);
      return MerkleAirdrop.at(tx.logs[0].args.drop);
    })
    .then(function (instance) {
      airdrop = instance;
      addContract('system', 'airdrop', airdrop.address);
      return airdrop.setRewardToken(cvx.address);
    })
    .then(function () {
      return cvx.transfer(airdrop.address, distroList.vecrv);
    })
    .then(function () {
      return cvx.balanceOf(airdrop.address);
    })
    .then(function (dropBalance) {
      console.log('airdrop balance: ' + dropBalance);
      return airdrop.setRoot(merkleRoot);
    })

    //Create convex pools
    // TODO:
    // .then(function() {
    // 	poolNames.push("3pool");
    // 	console.log("adding pool " +poolNames[poolNames.length-1]);
    // 	return pools.addPool("0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7"/** 3Pool address */,"0xbFcF63294aD7105dEa65aA58F8AE5BE2D9d0952A"/** 3Pool Gauge address */,0)
    // })

    .then(function () {
      return booster.poolLength();
    })
    .then(function (poolCount) {
      var pList = [];
      for (var i = 0; i < poolCount; i++) {
        pList.push(booster.poolInfo(i));
      }
      //var pinfo = await booster.poolInfo(0)
      return Promise.all(pList);
    })
    .then(function (poolInfoList) {
      //console.log("poolInfo: " +JSON.stringify(poolInfoList));
      for (var i = 0; i < poolInfoList.length; i++) {
        delete poolInfoList[i]['0'];
        delete poolInfoList[i]['1'];
        delete poolInfoList[i]['2'];
        delete poolInfoList[i]['3'];
        delete poolInfoList[i]['4'];
        delete poolInfoList[i]['5'];
        delete poolInfoList[i]['shutdown'];
        var crvrewards = poolInfoList[i]['crvRewards'];
        var rewardList = [];
        rewardList.push({ rToken: crv.address, rAddress: crvrewards });
        poolInfoList[i].rewards = rewardList;
        poolInfoList[i].name = poolNames[i];
        poolInfoList[i].id = i;
        poolsContracts.push(poolInfoList[i]);
      }
    })

    .then(function () {
      var contractListOutput = JSON.stringify(contractList, null, 4);
      console.log(contractListOutput);
      fs.writeFileSync('contracts.json', contractListOutput, function (err) {
        if (err) {
          return console.log('Error writing file: ' + err);
        }
      });
    });
};
