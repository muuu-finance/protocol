const { time } = require('@openzeppelin/test-helpers')
var fs = require('fs')
var jsonfile = require('jsonfile')
var BN = require('big-number')
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants')
var distroList = jsonfile.readFileSync('./distro.json')

const Booster = artifacts.require('Booster')
const CurveVoterProxy = artifacts.require('CurveVoterProxy')
const RewardFactory = artifacts.require('RewardFactory')
const StashFactory = artifacts.require('StashFactory')
const TokenFactory = artifacts.require('TokenFactory')
const ConvexToken = artifacts.require('ConvexToken')
const cvxCrvToken = artifacts.require('cvxCrvToken')
const CrvDepositor = artifacts.require('CrvDepositor')
const PoolManager = artifacts.require('PoolManager')
const BaseRewardPool = artifacts.require('BaseRewardPool')
const cvxRewardPool = artifacts.require('cvxRewardPool')
const ArbitratorVault = artifacts.require('ArbitratorVault')
const ClaimZap = artifacts.require('ClaimZap')
const ConvexMasterChef = artifacts.require('ConvexMasterChef')
const VestedEscrow = artifacts.require('VestedEscrow')
const MerkleAirdrop = artifacts.require('MerkleAirdrop')
const MerkleAirdropFactory = artifacts.require('MerkleAirdropFactory')
// define Mocks
const MintableERC20 = artifacts.require('MintableERC20')
const MockVotingEscrow = artifacts.require('MockCurveVoteEscrow')
const MockRegistry = artifacts.require('MockCurveRegistry')
const MockFeeDistributor = artifacts.require('MockCurveFeeDistributor')
const MockAddressProvider = artifacts.require('MockCurveAddressProvider')

const CvxLockerV2 = artifacts.require('CvxLockerV2')

module.exports = function (deployer, network, accounts) {
  if (network === 'skipMigration') {
    console.log(`Skip migration in ${network} network`)
    return
  }
  // you need to prepare curveVoterProxy beforehand
  // const convexVoterProxy = "0xE7FDdA2a4Ba464A9F11a54A62B378E79c94d8332";

  // tmp: team account
  const treasuryAddress = '0xCdfc500F7f0FCe1278aECb0340b523cD55b3EBbb'

  // TODO: invetigate the purpose of this
  const merkleRoot =
    '0x632a2ad201c5b95d3f75c1332afdcf489d4e6b4b7480cf878d8eba2aa87d5f73'

  // TODO: replace this with mock token addrress
  // const crv = "0xD533a949740bb3306d119CC777fa900bA034cd52";

  let admin = accounts[0]
  console.log('deploying from: ' + admin)
  var premine = new BN(0)
  premine.add(distroList.lpincentives)
  premine.add(distroList.vecrv)
  premine.add(distroList.teamcvxLpSeed)
  var vestedAddresses = distroList.vested.team.addresses.concat(
    distroList.vested.investor.addresses,
    distroList.vested.treasury.addresses,
  )
  // console.log("vested addresses: " +vestedAddresses.toString())
  var vestedAmounts = distroList.vested.team.amounts.concat(
    distroList.vested.investor.amounts,
    distroList.vested.treasury.amounts,
  )
  //console.log("vested amounts: " +vestedAmounts.toString())
  var totalVested = new BN(0)
  for (var i in vestedAmounts) {
    totalVested.add(vestedAmounts[i])
  }
  console.log('total vested: ' + totalVested.toString())
  premine.add(totalVested)
  console.log('total cvx premine: ' + premine.toString())
  var totaldistro = new BN(premine).add(distroList.miningRewards)
  console.log('total cvx: ' + totaldistro.toString())

  var booster,
    voter,
    rFactory,
    sFactory,
    tFactory,
    cvx,
    cvxCrv,
    deposit,
    arb,
    pools
  var crvToken
  var cvxCrvRewards, cvxRewards, airdrop, vesting
  var pairToken
  var crvdepositAmt, crvbal, cvxCrvBal
  var crv, weth, dai, threeCrv
  var convexVoterProxy
  var cvxLockerV2

  let mockVotingEscrow, mockRegistry, mockFeeDistributor, mockAddressProvider

  var rewardsStart = Math.floor(Date.now() / 1000) + 3600
  var rewardsEnd = rewardsStart + 1 * 364 * 86400

  var contractList = {}
  var systemContracts = {}
  var poolsContracts = []
  var poolNames = []
  contractList['system'] = systemContracts
  contractList['pools'] = poolsContracts
  contractList['mocks'] = {}

  var addContract = function (group, name, value) {
    contractList[group][name] = value
    var contractListOutput = JSON.stringify(contractList, null, 4)
    fs.writeFileSync('contracts.json', contractListOutput, function (err) {
      if (err) {
        return console.log('Error writing file: ' + err)
      }
    })
  }

  // addContract("system","voteProxy",convexVoterProxy);
  addContract('system', 'treasury', treasuryAddress)

  deployer
    // ========================== Preparation start ==========================
    .deploy(MintableERC20, 'crv', 'CRV', 18)
    .then((instance) => {
      crv = instance
      addContract('mocks', 'CRV', crv.address)
    })
    .then(() => deployer.deploy(MintableERC20, 'weth', 'WETH', 18))
    .then((instance) => {
      weth = instance
      addContract('mocks', 'WETH', weth.address)
    })
    .then(() => deployer.deploy(MintableERC20, 'dai', 'DAI', 18))
    .then((instance) => {
      dai = instance
      addContract('mocks', 'DAI', dai.address)
    })
    .then(() =>
      deployer.deploy(MintableERC20, '3Crv', 'Curve.fi DAI/USDC/USDT', 18),
    )
    .then((instance) => {
      threeCrv = instance
      addContract('mocks', '3Crv', threeCrv.address)
    })
    .then(() => deployer.deploy(MockVotingEscrow))
    .then((instance) => {
      mockVotingEscrow = instance
      addContract('mocks', 'mockVotingEscrow', mockVotingEscrow.address)
    })
    .then(() => deployer.deploy(MockRegistry, threeCrv.address))
    .then((instance) => {
      mockRegistry = instance
      addContract('mocks', 'mockRegistry', mockRegistry.address)
    })
    .then(() => deployer.deploy(MockFeeDistributor, threeCrv.address))
    .then((instance) => {
      mockFeeDistributor = instance
      addContract('mocks', 'mockFeeDistributor', mockFeeDistributor.address)
    })
    .then(() =>
      deployer.deploy(
        MockAddressProvider,
        mockRegistry.address,
        mockFeeDistributor.address,
      ),
    )
    .then((instance) => {
      mockAddressProvider = instance
      addContract('mocks', 'mockAddressProvider', mockAddressProvider.address)
    })
    .then(() =>
      deployer.deploy(
        CurveVoterProxy,
        crv.address,
        mockVotingEscrow.address,
        ZERO_ADDRESS, // TODO:
        ZERO_ADDRESS, // TODO:
      ),
    )
    .then((instance) => {
      voter = instance
      addContract('system', 'voteProxy', voter.address)
    })
    // ========================== Preparation end ==========================
    .then(() => deployer.deploy(ConvexToken, voter.address))
    .then((instance) => {
      cvx = instance
      addContract('system', 'cvx', cvx.address)
    })
    .then(() =>
      deployer.deploy(
        Booster,
        voter.address,
        cvx.address,
        crv.address,
        mockAddressProvider.address,
      ),
    )
    .then((instance) => {
      booster = instance
      addContract('system', 'booster', booster.address)
      return voter.owner()
    })
    .then((currentOwner) => {
      //if develop, change current owner to current deployer
      if (currentOwner != admin) {
        return voter.transferOwnership(admin, { from: currentOwner })
      }
    })
    .then(() => voter.setOperator(booster.address))
    .then(() => cvx.mint(accounts[0], premine.toString()))
    .then(() => deployer.deploy(RewardFactory, booster.address))
    .then((instance) => {
      rFactory = instance
      addContract('system', 'rFactory', rFactory.address)
    })
    .then(() => deployer.deploy(TokenFactory, booster.address))
    .then((instance) => {
      tFactory = instance
      addContract('system', 'tFactory', tFactory.address)
      return deployer.deploy(StashFactory, booster.address, rFactory.address)
    })
    .then((instance) => {
      sFactory = instance
      addContract('system', 'sFactory', sFactory.address)
      return deployer.deploy(cvxCrvToken)
    })
    .then((instance) => {
      cvxCrv = instance
      addContract('system', 'cvxCrv', cvxCrv.address)
      return deployer.deploy(
        CrvDepositor,
        voter.address,
        cvxCrv.address,
        crv.address,
        mockVotingEscrow.address, // TODO: replace
      )
    })
    .then((instance) => {
      deposit = instance
      addContract('system', 'crvDepositor', deposit.address)
      return cvxCrv.setOperator(deposit.address)
    })
    .then(() => voter.setDepositor(deposit.address))
    .then(() => deposit.initialLock())
    .then(() => booster.setTreasury(deposit.address))
    .then(() =>
      deployer.deploy(
        BaseRewardPool,
        0,
        cvxCrv.address,
        crv.address,
        booster.address,
        rFactory.address,
      ),
    )
    .then((instance) => {
      cvxCrvRewards = instance
      addContract('system', 'cvxCrvRewards', cvxCrvRewards.address)
      // reward manager is admin to add any new incentive programs
      return deployer.deploy(
        cvxRewardPool,
        cvx.address,
        crv.address,
        deposit.address,
        cvxCrvRewards.address,
        cvxCrv.address,
        booster.address,
        admin,
      )
    })
    .then((instance) => {
      cvxRewards = instance
      addContract('system', 'cvxRewards', cvxRewards.address)
      return booster.setRewardContracts(
        cvxCrvRewards.address,
        cvxRewards.address,
      )
    })
    .then(() =>
      deployer.deploy(
        PoolManager,
        booster.address,
        mockAddressProvider.address,
      ),
    )
    .then((instance) => {
      pools = instance
      addContract('system', 'poolManager', pools.address)
      return booster.setPoolManager(pools.address)
    })
    .then(() =>
      booster.setFactories(
        rFactory.address,
        sFactory.address,
        tFactory.address,
      ),
    )
    .then(() => booster.setFeeInfo())
    .then(() => deployer.deploy(ArbitratorVault, booster.address))
    .then((instance) => {
      arb = instance
      addContract('system', 'arbitratorVault', arb.address)
      return booster.setArbitrator(arb.address)
    })

    // added CVX LockerV2 ref: /contracts/test/UI_7_DeployLockerV2.js
    .then(() => {
      // TODO: constructor
      return deployer.deploy(CvxLockerV2)
    })
    .then((instance) => {
      cvxLockerV2 = instance
      addContract('system', 'cvxLockerV2', cvxLockerV2.address)
    })

    .then(() => {
      return deployer.deploy(
        ClaimZap,
        crv.address,
        cvx.address,
        cvxCrv.address,
        deposit.address,
        cvxCrvRewards.address,
        cvxRewards.address,
        treasuryAddress, // TODO: replace. this is supposed to be Factory cvxCRV in curve
        cvxLockerV2.address,
      )
    })
    .then((instance) => {
      addContract('system', 'claimZap', instance.address)
      return instance.setApprovals()
    })

    //Fund vested escrow
    .then(() => {
      //vest team, invest, treasury
      return deployer.deploy(
        VestedEscrow,
        cvx.address,
        rewardsStart,
        rewardsEnd,
        cvxRewards.address,
        admin,
      )
    })
    .then((instance) => {
      vesting = instance
      addContract('system', 'vestedEscrow', vesting.address)
      return cvx.approve(vesting.address, distroList.vested.total)
    })
    .then(() => vesting.addTokens(distroList.vested.total))
    .then(() => vesting.fund(vestedAddresses, vestedAmounts))
    .then(() => vesting.unallocatedSupply())
    .then((unallocatedSupply) => {
      console.log('vesting unallocatedSupply: ' + unallocatedSupply)
      return vesting.initialLockedSupply()
    })
    .then((initialLockedSupply) =>
      console.log('vesting initialLockedSupply: ' + initialLockedSupply),
    )
    .then(() => deployer.deploy(MerkleAirdropFactory))
    .then((dropFactory) => {
      addContract('system', 'dropFactory', dropFactory.address)
      return dropFactory.CreateMerkleAirdrop()
    })
    .then((tx) => {
      console.log('factory return: ' + tx.logs[0].args.drop)
      return MerkleAirdrop.at(tx.logs[0].args.drop)
    })
    .then((instance) => {
      airdrop = instance
      addContract('system', 'airdrop', airdrop.address)
      return airdrop.setRewardToken(cvx.address)
    })
    .then(() => cvx.transfer(airdrop.address, distroList.vecrv))
    .then(() => cvx.balanceOf(airdrop.address))
    .then((dropBalance) => {
      console.log('airdrop balance: ' + dropBalance)
      return airdrop.setRoot(merkleRoot)
    })

    //Create convex pools
    .then(() => {
      poolNames.push('3pool')
      console.log('adding pool ' + poolNames[poolNames.length - 1])
      return pools.addPool(
        // TODO: remove Curve address, use test or mock address
        '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7' /** 3Pool address */,
        '0xbFcF63294aD7105dEa65aA58F8AE5BE2D9d0952A' /** 3Pool Gauge address */,
        0,
      )
    })

    .then(() => booster.poolLength())
    .then((poolCount) => {
      var pList = []
      for (var i = 0; i < poolCount; i++) {
        pList.push(booster.poolInfo(i))
      }
      //var pinfo = await booster.poolInfo(0)
      return Promise.all(pList)
    })
    .then((poolInfoList) => {
      //console.log("poolInfo: " +JSON.stringify(poolInfoList));
      for (var i = 0; i < poolInfoList.length; i++) {
        delete poolInfoList[i]['0']
        delete poolInfoList[i]['1']
        delete poolInfoList[i]['2']
        delete poolInfoList[i]['3']
        delete poolInfoList[i]['4']
        delete poolInfoList[i]['5']
        delete poolInfoList[i]['shutdown']
        var crvrewards = poolInfoList[i]['crvRewards']
        var rewardList = []
        rewardList.push({ rToken: crv.address, rAddress: crvrewards })
        poolInfoList[i].rewards = rewardList
        poolInfoList[i].name = poolNames[i]
        poolInfoList[i].id = i
        poolsContracts.push(poolInfoList[i])
      }
    })

    .then(() => {
      var contractListOutput = JSON.stringify(contractList, null, 4)
      console.log(contractListOutput)
      fs.writeFileSync('contracts.json', contractListOutput, function (err) {
        if (err) {
          return console.log('Error writing file: ' + err)
        }
      })
    })
}
