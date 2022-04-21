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

// -- Contracts to use
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
// ---- Expansions
const MuuuLockerV2 = artifacts.require('MuuuLockerV2')

// -- Functions
const BASE_PATH = '.'
const BASE_NAME = 'contracts'
const EXTENSTION = 'json'
const getFilePath = (network, base_path = undefined, suffix = undefined) => {
  const basePath = base_path ? base_path : BASE_PATH
  const commonFilePath = `${basePath}/${BASE_NAME}-${network}`
  return suffix
    ? `${commonFilePath}-${suffix}.${EXTENSTION}`
    : `${commonFilePath}.${EXTENSTION}`
}
const getMockFilePath = (network) => `./contract-mocks-${network}.json`

const resetContractAddressesJson = (network) => {
  const fileName = getFilePath(network)
  if (fs.existsSync(fileName)) {
    const folderName = 'tmp'
    fs.mkdirSync(folderName, { recursive: true })
    // get current datetime in this timezone
    const date = new Date()
    date.setTime(date.getTime() + 9 * 60 * 60 * 1000)
    const strDate = date
      .toISOString()
      .replace(/(-|T|:)/g, '')
      .substring(0, 14)
    // rename current file
    fs.renameSync(fileName, getFilePath(network, `./tmp`, strDate))
  }
  fs.writeFileSync(fileName, JSON.stringify({}, null, 2))
}
const _addContract = (group, name, value, network) =>
  writeContractAddress(group, name, value, getFilePath(network))

const loadDeployedMockAddresses = (network) => {
  const filePath = getMockFilePath(network)
  const deployed = jsonfile.readFileSync(filePath)
  const {
    tokenMocks,
    kaglaMocks: {
      votingEscrow,
      gauge,
      feeDistributor,
      registry,
      addressProvider,
    },
  } = deployed

  // NOTE: make return values by considering how to use in migration
  return {
    kgl: { address: tokenMocks['KGL'] },
    weth: { address: tokenMocks['WETH'] },
    dai: { address: tokenMocks['DAI'] },
    threeKgl: { address: tokenMocks['3Kgl'] },
    mockVotingEscrow: { address: votingEscrow },
    mockRegistry: { address: registry },
    mockFeeDistributor: { address: feeDistributor },
    mockAddressProvider: { address: addressProvider },
    mockKaglaGauge: { address: gauge },
  }
}

// -- Main Script
module.exports = function (deployer, network, accounts) {
  if (network === 'skipMigration') {
    console.log(`Skip migration in ${network} network`)
    return
  }
  console.log(`network: ${network}`)
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

  // -- Variable declarations
  // ---- contracts
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
  // ---- expantions
  let muuuLockerV2
  // ---- mocks (tokens, kaglas)
  const {
    kgl,
    threeKgl,
    mockVotingEscrow,
    mockAddressProvider,
    mockKaglaGauge,
  } = loadDeployedMockAddresses(network)

  const rewardsStart = Math.floor(Date.now() / 1000) + 3600
  const rewardsEnd = rewardsStart + 1 * 364 * 86400

  // for save pool infos to json
  const poolsContracts = []
  const poolNames = []

  // reset json to have deployed contracts' addresses
  resetContractAddressesJson(network)
  // - define function to write to json
  const addContract = (_group, _name, _value) =>
    _addContract(_group, _name, _value, network)
  const contractsJsonFilePath = getFilePath(network)

  // addContract("system","voteProxy",muuuVoterProxy);
  addContract('system', 'treasury', treasuryAddress)

  // ========================== Preparation start ==========================
  deployer
    .deploy(
      KaglaVoterProxy,
      kgl.address,
      mockVotingEscrow.address,
      ZERO_ADDRESS, // TODO:
      ZERO_ADDRESS, // TODO:
    )
    .then((instance) => {
      voter = instance
      addContract('system', 'voteProxy', voter.address)
    })
    // ========================== Preparation end ==========================
    .then(() => deployer.deploy(MuuuToken))
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
    .then(() => muuu.addMinter(booster.address)
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
    .then(() => booster.setLockerStakingProxy(deposit.address)) // temp
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
        muKglRewards.address, // BaseRewardPool
        muuuRewards.address, // muuuRewardPool
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
      writeValueToGroup('pools', poolsContracts, contractsJsonFilePath)
    })
    .then(() => console.log(readContractAddresses(contractsJsonFilePath)))
}
