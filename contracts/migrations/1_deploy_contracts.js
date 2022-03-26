const fs = require('fs')
const jsonfile = require('jsonfile')
const BN = require('big-number')
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants')
const {
  readContractAddresses,
  writeContractAddress,
  writeValueToGroup,
} = require('../utils/access_contracts_json')

const distroList = jsonfile.readFileSync('./distro.json')

const Booster = artifacts.require('Booster')
const KaglaVoterProxy = artifacts.require('KaglaVoterProxy')
const RewardFactory = artifacts.require('RewardFactory')
const StashFactory = artifacts.require('StashFactory')
const TokenFactory = artifacts.require('TokenFactory')
const MuuuToken = artifacts.require('MuuuToken')
const MuKglToken = artifacts.require('MuKglToken')
const KglDepositor = artifacts.require('KglDepositor')
const PoolManager = artifacts.require('PoolManager')
const BaseRewardPool = artifacts.require('BaseRewardPool')
const muuuRewardPool = artifacts.require('MuuuRewardPool')
const ArbitratorVault = artifacts.require('ArbitratorVault')
const ClaimZap = artifacts.require('ClaimZap')
const VestedEscrow = artifacts.require('VestedEscrow')
const MerkleAirdrop = artifacts.require('MerkleAirdrop')
const MerkleAirdropFactory = artifacts.require('MerkleAirdropFactory')
// define Mocks
const MintableERC20 = artifacts.require('MintableERC20')
const MockVotingEscrow = artifacts.require('MockKaglaVoteEscrow')
const MockRegistry = artifacts.require('MockKaglaRegistry')
const MockFeeDistributor = artifacts.require('MockKaglaFeeDistributor')
const MockAddressProvider = artifacts.require('MockKaglaAddressProvider')
const MockKaglaGauge = artifacts.require('MockKaglaGauge')

const MuuuLockerV2 = artifacts.require('MuuuLockerV2')

const resetContractAddressesJson = () => {
  if (fs.existsSync('./contracts.json')) {
    // TODO: evacuate original file to rename
  }
  fs.writeFileSync('./contracts.json', JSON.stringify({}, null, 2))
}

const addContract = (group, name, value) =>
  writeContractAddress(group, name, value, './contracts.json')

module.exports = function (deployer, network, accounts) {
  if (network === 'skipMigration') {
    console.log(`Skip migration in ${network} network`)
    return
  }
  // you need to prepare kaglaVoterProxy beforehand
  // const muuuVoterProxy = "0xE7FDdA2a4Ba464A9F11a54A62B378E79c94d8332";

  // tmp: team account
  const treasuryAddress = '0xCdfc500F7f0FCe1278aECb0340b523cD55b3EBbb'

  // TODO: invetigate the purpose of this
  const merkleRoot =
    '0x632a2ad201c5b95d3f75c1332afdcf489d4e6b4b7480cf878d8eba2aa87d5f73'

  // TODO: replace this with mock token addrress
  // const kgl = "0xD533a949740bb3306d119CC777fa900bA034cd52";

  const admin = accounts[0]
  console.log('deploying from: ' + admin)
  const premine = new BN(0)
  premine.add(distroList.lpincentives)
  premine.add(distroList.vekgl)
  premine.add(distroList.teammuuuLpSeed)
  const vestedAddresses = distroList.vested.team.addresses.concat(
    distroList.vested.investor.addresses,
    distroList.vested.treasury.addresses,
  )
  // console.log("vested addresses: " +vestedAddresses.toString())
  const vestedAmounts = distroList.vested.team.amounts.concat(
    distroList.vested.investor.amounts,
    distroList.vested.treasury.amounts,
  )
  //console.log("vested amounts: " +vestedAmounts.toString())
  const totalVested = new BN(0)
  for (var i in vestedAmounts) {
    totalVested.add(vestedAmounts[i])
  }
  console.log('total vested: ' + totalVested.toString())
  premine.add(totalVested)
  console.log('total muuu premine: ' + premine.toString())
  const totaldistro = new BN(premine).add(distroList.miningRewards)
  console.log('total muuu: ' + totaldistro.toString())

  let booster,
    voter,
    rFactory,
    sFactory,
    tFactory,
    muuu,
    muKgl,
    deposit,
    arb,
    pools
  let muKglRewards, muuuRewards, airdrop, vesting
  let kgl, weth, dai, threeKgl
  let muuuLockerV2

  let mockVotingEscrow,
    mockRegistry,
    mockFeeDistributor,
    mockAddressProvider,
    mockKaglaGauge

  const rewardsStart = Math.floor(Date.now() / 1000) + 3600
  const rewardsEnd = rewardsStart + 1 * 364 * 86400

  // for save pool infos to json
  const poolsContracts = []
  const poolNames = []

  // reset json to have deployed contracts' addresses
  resetContractAddressesJson()

  // addContract("system","voteProxy",muuuVoterProxy);
  addContract('system', 'treasury', treasuryAddress)

  deployer
    // ========================== Preparation start ==========================
    .deploy(MintableERC20, 'kgl', 'KGL', 18)
    .then((instance) => {
      kgl = instance
      addContract('mocks', 'KGL', kgl.address)
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
      deployer.deploy(MintableERC20, '3Kgl', 'Kagla.fi DAI/USDC/USDT', 18),
    )
    .then((instance) => {
      threeKgl = instance
      addContract('mocks', '3Kgl', threeKgl.address)
    })
    .then(() => deployer.deploy(MockKaglaGauge, threeKgl.address))
    .then((instance) => {
      mockKaglaGauge = instance
      addContract('mocks', 'mockKaglaGauge', mockKaglaGauge.address)
    })
    .then(() => deployer.deploy(MockVotingEscrow))
    .then((instance) => {
      mockVotingEscrow = instance
      addContract('mocks', 'mockVotingEscrow', mockVotingEscrow.address)
    })
    .then(() =>
      deployer.deploy(
        MockRegistry,
        threeKgl.address,
        mockKaglaGauge.address,
        threeKgl.address,
      ),
    )
    .then((instance) => {
      mockRegistry = instance
      addContract('mocks', 'mockRegistry', mockRegistry.address)
    })
    .then(() => deployer.deploy(MockFeeDistributor, threeKgl.address))
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
        KaglaVoterProxy,
        kgl.address,
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
    .then(() => deployer.deploy(MuuuToken, voter.address))
    .then((instance) => {
      muuu = instance
      addContract('system', 'muuu', muuu.address)
    })
    .then(() =>
      deployer.deploy(
        Booster,
        voter.address,
        muuu.address,
        kgl.address,
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
    .then(() => muuu.mint(accounts[0], premine.toString()))
    .then(() => deployer.deploy(RewardFactory, booster.address, kgl.address))
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
      return deployer.deploy(MuKglToken)
    })
    .then((instance) => {
      muKgl = instance
      addContract('system', 'muKgl', muKgl.address)
      return deployer.deploy(
        KglDepositor,
        voter.address,
        muKgl.address,
        kgl.address,
        mockVotingEscrow.address, // TODO: replace
      )
    })
    .then((instance) => {
      deposit = instance
      addContract('system', 'kglDepositor', deposit.address)
      return muKgl.setOperator(deposit.address)
    })
    .then(() => voter.setDepositor(deposit.address))
    .then(() => deposit.initialLock())
    .then(() => booster.setTreasury(deposit.address))
    .then(() =>
      deployer.deploy(
        BaseRewardPool,
        0,
        muKgl.address,
        kgl.address,
        booster.address,
        rFactory.address,
      ),
    )
    .then((instance) => {
      muKglRewards = instance
      addContract('system', 'muKglRewards', muKglRewards.address)
      // reward manager is admin to add any new incentive programs
      return deployer.deploy(
        muuuRewardPool,
        muuu.address,
        kgl.address,
        deposit.address,
        muKglRewards.address,
        muKgl.address,
        booster.address,
        admin,
      )
    })
    .then((instance) => {
      muuuRewards = instance
      addContract('system', 'muuuRewards', muuuRewards.address)
      return booster.setRewardContracts(
        muKglRewards.address,
        muuuRewards.address,
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

    // added MUUU LockerV2 ref: /contracts/test/UI_7_DeployLockerV2.js
    .then(() => {
      // TODO: constructor
      return deployer.deploy(MuuuLockerV2)
    })
    .then((instance) => {
      muuuLockerV2 = instance
      addContract('system', 'muuuLockerV2', muuuLockerV2.address)
    })

    .then(() => {
      return deployer.deploy(
        ClaimZap,
        kgl.address,
        muuu.address,
        muKgl.address,
        deposit.address,
        muKglRewards.address,
        muuuRewards.address,
        treasuryAddress, // TODO: replace. this is supposed to be Factory muKGL in kagla
        muuuLockerV2.address,
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
        muuu.address,
        rewardsStart,
        rewardsEnd,
        muuuRewards.address,
        admin,
      )
    })
    .then((instance) => {
      vesting = instance
      addContract('system', 'vestedEscrow', vesting.address)
      return muuu.approve(vesting.address, distroList.vested.total)
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
      return airdrop.setRewardToken(muuu.address)
    })
    .then(() => muuu.transfer(airdrop.address, distroList.vekgl))
    .then(() => muuu.balanceOf(airdrop.address))
    .then((dropBalance) => {
      console.log('airdrop balance: ' + dropBalance)
      return airdrop.setRoot(merkleRoot)
    })

    //Create muuu pools
    .then(() => {
      poolNames.push('3pool')
      console.log('adding pool ' + poolNames[poolNames.length - 1])
      return pools.addPool(
        // TODO: remove Kagla address, use test or mock address
        threeKgl.address /** 3Pool address */,
        mockKaglaGauge.address /** 3Pool Gauge address */,
        0,
      )
    })

    .then(() => booster.poolLength())
    .then((poolCount) => {
      const pList = []
      for (let i = 0; i < poolCount; i++) {
        pList.push(booster.poolInfo(i))
      }
      //const pinfo = await booster.poolInfo(0)
      return Promise.all(pList)
    })
    .then((poolInfoList) => {
      //console.log("poolInfo: " +JSON.stringify(poolInfoList));
      for (let i = 0; i < poolInfoList.length; i++) {
        delete poolInfoList[i]['0']
        delete poolInfoList[i]['1']
        delete poolInfoList[i]['2']
        delete poolInfoList[i]['3']
        delete poolInfoList[i]['4']
        delete poolInfoList[i]['5']
        delete poolInfoList[i]['shutdown']
        const kglrewards = poolInfoList[i]['kglRewards']
        const rewardList = []
        rewardList.push({ rToken: kgl.address, rAddress: kglrewards })
        poolInfoList[i].rewards = rewardList
        poolInfoList[i].name = poolNames[i]
        poolInfoList[i].id = i
        poolsContracts.push(poolInfoList[i])
      }
      writeValueToGroup('pools', poolsContracts, './contracts.json')
    })
    .then(() => console.log(readContractAddresses('./contracts.json')))
}
