import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { BigNumber, ethers } from 'ethers'
import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import {
  ArbitratorVault__factory,
  BaseRewardPool__factory,
  BoosterOwner__factory,
  Booster__factory,
  ERC20__factory,
  KaglaVoterProxy__factory,
  KglDepositor__factory,
  MuKglToken__factory,
  MuuuLockerV2__factory,
  MuuuRewardPool__factory,
  MuuuStakingProxyV2__factory,
  MuuuToken__factory,
  PoolManagerProxy__factory,
  PoolManagerSecondaryProxy__factory,
  PoolManagerV3__factory,
  PoolManager__factory,
  StashFactoryV2__factory,
  TreasuryFunds__factory,
} from '../../types'
import { TaskUtils } from '../utils'

type CheckFunctionArgs = {
  address: string
  providerOrSigner: SignerWithAddress | ethers.providers.JsonRpcProvider
}

const checkERC20Token = async (args: CheckFunctionArgs & { name?: string }) => {
  if (args.name) {
    console.log(`--- [start] ${args.name} ---`)
    console.log(`> address ... ${args.address}`)
  }
  const _instance = await ERC20__factory.connect(
    args.address,
    args.providerOrSigner,
  )
  const targets = [
    { label: 'name', fn: _instance.name },
    { label: 'symbol', fn: _instance.symbol },
    { label: 'decimals', fn: _instance.decimals },
    { label: 'totalSupply', fn: _instance.totalSupply },
  ]
  for (const _v of targets) console.log(`${_v.label} ... ${await _v.fn()}`)
  if (args.name) console.log(`--- [end] ${args.name} ---`)
}

const checkKaglaVoterProxy = async (args: CheckFunctionArgs) => {
  console.log(`--- [start] KaglaVoterProxy ---`)
  console.log(`> address ... ${args.address}`)
  const _instance = await KaglaVoterProxy__factory.connect(
    args.address,
    args.providerOrSigner,
  )
  const targets = [
    { label: 'name', fn: _instance.getName },
    { label: 'kgl', fn: _instance.kgl },
    { label: 'votingEscrow', fn: _instance.votingEscrow },
    { label: 'gaugeController', fn: _instance.gaugeController },
    { label: 'tokenMinter', fn: _instance.tokenMinter },
    { label: 'operator', fn: _instance.operator },
    { label: 'depositor', fn: _instance.depositor },
  ]
  for (const _v of targets) console.log(`${_v.label} ... ${await _v.fn()}`)
  console.log(`--- [end] KaglaVoterProxy ---`)
}

const checkMuuuToken = async (args: CheckFunctionArgs) => {
  console.log(`--- [start] MuuuToken ---`)
  console.log(`> address ... ${args.address}`)
  await checkERC20Token(args)
  const _instance = await MuuuToken__factory.connect(
    args.address,
    args.providerOrSigner,
  )
  const targets = [
    { label: 'maxSupply', fn: _instance.maxSupply },
    { label: 'totalCliffs', fn: _instance.totalCliffs },
    { label: 'reductionPerCliff', fn: _instance.reductionPerCliff },
  ]
  for (const _v of targets) console.log(`${_v.label} ... ${await _v.fn()}`)
  console.log(`--- [end] MuuuToken ---`)
}

const checkPreminedMuuu = async (
  args: CheckFunctionArgs & { treasuryAddress: string },
) => {
  console.log(`--- [start] check Premined MUUU ---`)
  const _instance = await MuuuToken__factory.connect(
    args.address,
    args.providerOrSigner,
  )
  const formatted = (v: BigNumber) => ethers.utils.formatEther(v)

  console.log(`maxSupply ... ${formatted(await _instance.maxSupply())}`)
  console.log(`totalSupply ... ${formatted(await _instance.totalSupply())}`)
  console.log(
    `treasury(${args.treasuryAddress}) ... ${formatted(
      await _instance.balanceOf(args.treasuryAddress),
    )}`,
  )

  console.log(`--- [end] check Premined MUUU ---`)
}

const checkBooster = async (args: CheckFunctionArgs) => {
  console.log(`--- [start] Booster ---`)
  console.log(`> address ... ${args.address}`)
  const _instance = await Booster__factory.connect(
    args.address,
    args.providerOrSigner,
  )
  const targets = [
    { label: 'owner', fn: _instance.owner },
    { label: 'kgl', fn: _instance.kgl },
    { label: 'voteOwnership', fn: _instance.voteOwnership },
    { label: 'voteParameter', fn: _instance.voteParameter },
    { label: 'lockIncentive', fn: _instance.lockIncentive },
    { label: 'stakerIncentive', fn: _instance.stakerIncentive },
    { label: 'earmarkIncentive', fn: _instance.earmarkIncentive },
    { label: 'feeManager', fn: _instance.feeManager },
    { label: 'poolManager', fn: _instance.poolManager },
    { label: 'staker', fn: _instance.staker },
    { label: 'minter', fn: _instance.minter },
    { label: 'rewardFactory', fn: _instance.rewardFactory },
    { label: 'stashFactory', fn: _instance.stashFactory },
    { label: 'tokenFactory', fn: _instance.tokenFactory },
    { label: 'voteDelegate', fn: _instance.voteDelegate },
    { label: 'lockerStakingProxy', fn: _instance.lockerStakingProxy },
    { label: 'stakerRewards', fn: _instance.stakerRewards },
    { label: 'lockRewards', fn: _instance.lockRewards },
    { label: 'lockFees', fn: _instance.lockFees },
    { label: 'feeDistro', fn: _instance.feeDistro },
    { label: 'feeToken', fn: _instance.feeToken },
    { label: 'registry', fn: _instance.registry },
    { label: 'isShutdown', fn: _instance.isShutdown },
  ]
  for (const _v of targets) console.log(`${_v.label} ... ${await _v.fn()}`)
  const _poolLength = await _instance.poolLength()
  console.log(`poolLength ... ${_poolLength.toNumber()}`)
  for (let i = 0; i < _poolLength.toNumber(); i++) {
    console.log(`> poolInfo(${i})`)
    console.log(await _instance.poolInfo(i))
  }
  console.log(`--- [end] Booster ---`)
}

const checkBoosterOwner = async (args: CheckFunctionArgs) => {
  console.log(`--- [start] BoosterOwner ---`)
  console.log(`> address ... ${args.address}`)
  const _instance = await BoosterOwner__factory.connect(
    args.address,
    args.providerOrSigner,
  )
  const targets = [
    { label: 'owner', fn: _instance.owner },
    { label: 'stashFactory', fn: _instance.stashFactory },
    { label: 'rescueStash', fn: _instance.rescueStash },
    { label: 'poolManager', fn: _instance.poolManager },
    { label: 'pendingowner', fn: _instance.pendingowner },
    { label: 'isSealed', fn: _instance.isSealed },
    { label: 'FORCE_DELAY', fn: _instance.FORCE_DELAY },
    { label: 'isForceTimerStarted', fn: _instance.isForceTimerStarted },
    { label: 'forceTimestamp', fn: _instance.forceTimestamp },
  ]
  for (const _v of targets) console.log(`${_v.label} ... ${await _v.fn()}`)
  console.log(`--- [end] BoosterOwner ---`)
}

const checkStashFactoryV2 = async (args: CheckFunctionArgs) => {
  console.log(`--- [start] StashFactoryV2 ---`)
  console.log(`> address ... ${args.address}`)
  const _instance = await StashFactoryV2__factory.connect(
    args.address,
    args.providerOrSigner,
  )
  const targets = [
    { label: 'operator', fn: _instance.operator },
    { label: 'rewardFactory', fn: _instance.rewardFactory },
    { label: 'proxyFactory', fn: _instance.proxyFactory },
    { label: 'v3Implementation', fn: _instance.v3Implementation },
  ]
  for (const _v of targets) console.log(`${_v.label} ... ${await _v.fn()}`)
  console.log(`--- [end] StashFactoryV2 ---`)
}

const checkMuKglToken = async (args: CheckFunctionArgs) => {
  console.log(`--- [start] MuKglToken ---`)
  console.log(`> address ... ${args.address}`)
  await checkERC20Token(args)
  const _instance = await MuKglToken__factory.connect(
    args.address,
    args.providerOrSigner,
  )
  const targets = [{ label: 'operator', fn: _instance.operator }]
  for (const _v of targets) console.log(`${_v.label} ... ${await _v.fn()}`)
  console.log(`--- [end] MuKglToken ---`)
}

const checkKglDepositor = async (args: CheckFunctionArgs) => {
  console.log(`--- [start] KglDepositor ---`)
  console.log(`> address ... ${args.address}`)
  const _instance = await KglDepositor__factory.connect(
    args.address,
    args.providerOrSigner,
  )
  const targets = [
    { label: 'kgl', fn: _instance.kgl },
    { label: 'votingEscrow', fn: _instance.votingEscrow },
    { label: 'lockIncentive', fn: _instance.lockIncentive },
    { label: 'FEE_DENOMINATOR', fn: _instance.FEE_DENOMINATOR },
    { label: 'feeManager', fn: _instance.feeManager },
    { label: 'staker', fn: _instance.staker },
    { label: 'minter', fn: _instance.minter },
    { label: 'incentiveKgl', fn: _instance.incentiveKgl },
    { label: 'unlockTime', fn: _instance.unlockTime },
  ]
  for (const _v of targets) console.log(`${_v.label} ... ${await _v.fn()}`)
  console.log(`--- [end] KglDepositor ---`)
}

const checkBaseRewardPool = async (
  args: CheckFunctionArgs & { name: string },
) => {
  console.log(`--- [start] ${args.name} ---`)
  console.log(`> address ... ${args.address}`)
  const _instance = await BaseRewardPool__factory.connect(
    args.address,
    args.providerOrSigner,
  )
  const targets = [
    { label: 'rewardToken', fn: _instance.rewardToken },
    { label: 'stakingToken', fn: _instance.stakingToken },
    { label: 'duration', fn: _instance.duration },
    { label: 'operator', fn: _instance.operator },
    { label: 'rewardManager', fn: _instance.rewardManager },
    { label: 'pid', fn: _instance.pid },
    { label: 'periodFinish', fn: _instance.periodFinish },
    { label: 'rewardRate', fn: _instance.rewardRate },
    { label: 'lastUpdateTime', fn: _instance.lastUpdateTime },
    { label: 'rewardPerTokenStored', fn: _instance.rewardPerTokenStored },
    { label: 'queuedRewards', fn: _instance.queuedRewards },
    { label: 'currentRewards', fn: _instance.currentRewards },
    { label: 'historicalRewards', fn: _instance.historicalRewards },
    { label: 'newRewardRatio', fn: _instance.newRewardRatio },
    { label: 'totalSupply', fn: _instance.totalSupply },
    {
      label: 'lastTimeRewardApplicable',
      fn: _instance.lastTimeRewardApplicable,
    },
    { label: 'rewardPerToken', fn: _instance.rewardPerToken },
  ]
  for (const _v of targets) console.log(`${_v.label} ... ${await _v.fn()}`)
  const _extraRewardsLength = Number(await _instance.extraRewardsLength())
  console.log(`extraRewardsLength ... ${_extraRewardsLength}`)
  if (_extraRewardsLength > 0) {
    for (let i = 0; i < _extraRewardsLength; i++)
      console.log(`extraRewards:${i} ... ${await _instance.extraRewards(i)}`)
  }
  console.log(`--- [end] ${args.name} ---`)
}

const checkMuuuRewardPool = async (args: CheckFunctionArgs) => {
  console.log(`--- [start] MuuuRewardPool ---`)
  console.log(`> address ... ${args.address}`)
  const _instance = await MuuuRewardPool__factory.connect(
    args.address,
    args.providerOrSigner,
  )
  const targets = [
    { label: 'rewardToken', fn: _instance.rewardToken },
    { label: 'stakingToken', fn: _instance.stakingToken },
    { label: 'duration', fn: _instance.duration },
    { label: 'FEE_DENOMINATOR', fn: _instance.FEE_DENOMINATOR },
    { label: 'operator', fn: _instance.operator },
    { label: 'kglDeposits', fn: _instance.kglDeposits },
    { label: 'muKglRewards', fn: _instance.muKglRewards },
    { label: 'muKglToken', fn: _instance.muKglToken },
    { label: 'rewardManager', fn: _instance.rewardManager },
    { label: 'periodFinish', fn: _instance.periodFinish },
    { label: 'rewardRate', fn: _instance.rewardRate },
    { label: 'lastUpdateTime', fn: _instance.lastUpdateTime },
    { label: 'rewardPerTokenStored', fn: _instance.rewardPerTokenStored },
    { label: 'queuedRewards', fn: _instance.queuedRewards },
    { label: 'currentRewards', fn: _instance.currentRewards },
    { label: 'historicalRewards', fn: _instance.historicalRewards },
    { label: 'newRewardRatio', fn: _instance.newRewardRatio },
    { label: 'totalSupply', fn: _instance.totalSupply },
    {
      label: 'lastTimeRewardApplicable',
      fn: _instance.lastTimeRewardApplicable,
    },
    { label: 'rewardPerToken', fn: _instance.rewardPerToken },
  ]
  for (const _v of targets) console.log(`${_v.label} ... ${await _v.fn()}`)
  const _extraRewardsLength = Number(await _instance.extraRewardsLength())
  console.log(`extraRewardsLength ... ${_extraRewardsLength}`)
  if (_extraRewardsLength > 0) {
    for (let i = 0; i < _extraRewardsLength; i++)
      console.log(`extraRewards:${i} ... ${await _instance.extraRewards(i)}`)
  }
  console.log(`--- [end] MuuuRewardPool ---`)
}

const checkPoolManager = async (args: CheckFunctionArgs) => {
  console.log(`--- [start] PoolManager ---`)
  console.log(`> address ... ${args.address}`)
  const _instance = await PoolManager__factory.connect(
    args.address,
    args.providerOrSigner,
  )
  const targets = [
    { label: 'operator', fn: _instance.operator },
    { label: 'pools', fn: _instance.pools },
    { label: 'addressProvider', fn: _instance.addressProvider },
  ]
  for (const _v of targets) console.log(`${_v.label} ... ${await _v.fn()}`)
  console.log(`--- [end] PoolManager ---`)
}

const checkPoolManagerProxy = async (args: CheckFunctionArgs) => {
  console.log(`--- [start] PoolManagerProxy ---`)
  console.log(`> address ... ${args.address}`)
  const _instance = await PoolManagerProxy__factory.connect(
    args.address,
    args.providerOrSigner,
  )
  const targets = [
    { label: 'owner', fn: _instance.owner },
    { label: 'operator', fn: _instance.operator },
    { label: 'pools', fn: _instance.pools },
  ]
  for (const _v of targets) console.log(`${_v.label} ... ${await _v.fn()}`)
  console.log(`--- [end] PoolManagerProxy ---`)
}
const checkPoolManagerSecondaryProxy = async (args: CheckFunctionArgs) => {
  console.log(`--- [start] PoolManagerSecondaryProxy ---`)
  console.log(`> address ... ${args.address}`)
  const _instance = await PoolManagerSecondaryProxy__factory.connect(
    args.address,
    args.providerOrSigner,
  )
  const targets = [
    { label: 'owner', fn: _instance.owner },
    { label: 'operator', fn: _instance.operator },
    { label: 'pools', fn: _instance.pools },
    { label: 'booster', fn: _instance.booster },
    { label: 'gaugeController', fn: _instance.gaugeController },
    { label: 'isShutdown', fn: _instance.isShutdown },
  ]
  for (const _v of targets) console.log(`${_v.label} ... ${await _v.fn()}`)
  console.log(`--- [end] PoolManagerSecondaryProxy ---`)
}
const checkPoolManagerV3 = async (args: CheckFunctionArgs) => {
  console.log(`--- [start] PoolManagerV3 ---`)
  console.log(`> address ... ${args.address}`)
  const _instance = await PoolManagerV3__factory.connect(
    args.address,
    args.providerOrSigner,
  )
  const targets = [
    { label: 'operator', fn: _instance.operator },
    { label: 'pools', fn: _instance.pools },
    { label: 'gaugeController', fn: _instance.gaugeController },
  ]
  for (const _v of targets) console.log(`${_v.label} ... ${await _v.fn()}`)
  console.log(`--- [end] PoolManagerV3 ---`)
}

const checkArbitratorVault = async (args: CheckFunctionArgs) => {
  console.log(`--- [start] ArbitratorVault ---`)
  console.log(`> address ... ${args.address}`)
  const _instance = await ArbitratorVault__factory.connect(
    args.address,
    args.providerOrSigner,
  )
  const targets = [
    { label: 'operator', fn: _instance.operator },
    { label: 'depositor', fn: _instance.depositor },
  ]
  for (const _v of targets) console.log(`${_v.label} ... ${await _v.fn()}`)
  console.log(`--- [end] ArbitratorVault ---`)
}

const checkMuuuLockerV2 = async (args: CheckFunctionArgs) => {
  console.log(`--- [start] MuuuLockerV2 ---`)
  console.log(`> address ... ${args.address}`)
  const _instance = await MuuuLockerV2__factory.connect(
    args.address,
    args.providerOrSigner,
  )
  const targets = [
    { label: 'stakingToken', fn: _instance.stakingToken },
    { label: 'muKgl', fn: _instance.muKgl },
    { label: 'rewardsDuration', fn: _instance.rewardsDuration },
    { label: 'lockDuration', fn: _instance.lockDuration },
    { label: 'lockedSupply', fn: _instance.lockedSupply },
    { label: 'boostedSupply', fn: _instance.boostedSupply },
    { label: 'boostPayment', fn: _instance.boostPayment },
    { label: 'maximumBoostPayment', fn: _instance.maximumBoostPayment },
    { label: 'boostRate', fn: _instance.boostRate },
    { label: 'nextMaximumBoostPayment', fn: _instance.nextMaximumBoostPayment },
    { label: 'nextBoostRate', fn: _instance.nextBoostRate },
    { label: 'denominator', fn: _instance.denominator },
    { label: 'minimumStake', fn: _instance.minimumStake },
    { label: 'maximumStake', fn: _instance.maximumStake },
    { label: 'stakingProxy', fn: _instance.stakingProxy },
    { label: 'mukglStaking', fn: _instance.mukglStaking },
    { label: 'stakeOffsetOnLock', fn: _instance.stakeOffsetOnLock },
    { label: 'kickRewardPerEpoch', fn: _instance.kickRewardPerEpoch },
    { label: 'kickRewardEpochDelay', fn: _instance.kickRewardEpochDelay },
    { label: 'name', fn: _instance.name },
    { label: 'symbol', fn: _instance.symbol },
    { label: 'decimals', fn: _instance.decimals },
    { label: 'version', fn: _instance.version },
    { label: 'totalSupply', fn: _instance.totalSupply },
    { label: 'epochCount', fn: _instance.epochCount },
  ]
  for (const _v of targets) console.log(`${_v.label} ... ${await _v.fn()}`)
  console.log(`--- [end] MuuuLockerV2 ---`)
}

const checkMuuuStakingProxyV2 = async (args: CheckFunctionArgs) => {
  console.log(`--- [start] MuuuStakingProxyV2 ---`)
  console.log(`> address ... ${args.address}`)
  const _instance = await MuuuStakingProxyV2__factory.connect(
    args.address,
    args.providerOrSigner,
  )
  const targets = [
    { label: 'kgl', fn: _instance.kgl },
    { label: 'muuu', fn: _instance.muuu },
    { label: 'muKgl', fn: _instance.muKgl },
    { label: 'muuuStaking', fn: _instance.muuuStaking },
    { label: 'muKglStaking', fn: _instance.muKglStaking },
    { label: 'kglDeposit', fn: _instance.kglDeposit },
    { label: 'denominator', fn: _instance.denominator },
    { label: 'rewards', fn: _instance.rewards },
    { label: 'owner', fn: _instance.owner },
    { label: 'pendingOwner', fn: _instance.pendingOwner },
    { label: 'callIncentive', fn: _instance.callIncentive },
    { label: 'denominator', fn: _instance.denominator },
    { label: 'getBalance', fn: _instance.getBalance },
  ]
  for (const _v of targets) console.log(`${_v.label} ... ${await _v.fn()}`)
  console.log(`--- [end] MuuuStakingProxyV2 ---`)
}

const checkTreasuryFunds = async (args: CheckFunctionArgs) => {
  console.log(`--- [start] TreasuryFunds ---`)
  console.log(`> address ... ${args.address}`)
  const _instance = await TreasuryFunds__factory.connect(
    args.address,
    args.providerOrSigner,
  )
  const targets = [{ label: 'operator', fn: _instance.operator }]
  for (const _v of targets) console.log(`${_v.label} ... ${await _v.fn()}`)
  console.log(`--- [end] TreasuryFunds ---`)
}

task('check-deployed-contracts', 'Check deployed contracts').setAction(
  async ({}, hre: HardhatRuntimeEnvironment) => {
    const { network, ethers } = hre
    if (
      !(
        network.name === 'astar' ||
        network.name === 'shiden' ||
        network.name === 'localhost'
      )
    )
      throw new Error('Support only astar, shiden...')
    console.log(`------- START -------`)
    console.log(`network ... ${network.name}`)

    const { system } = TaskUtils.loadDeployedContractAddresses({
      network: network.name,
    })

    await checkKaglaVoterProxy({
      address: system.voteProxy,
      providerOrSigner: ethers.provider,
    })

    await checkMuuuToken({
      address: system.muuu,
      providerOrSigner: ethers.provider,
    })

    await checkBooster({
      address: system.booster,
      providerOrSigner: ethers.provider,
    })

    await checkStashFactoryV2({
      address: system.sFactory,
      providerOrSigner: ethers.provider,
    })

    await checkMuKglToken({
      address: system.muKgl,
      providerOrSigner: ethers.provider,
    })

    await checkKglDepositor({
      address: system.kglDepositor,
      providerOrSigner: ethers.provider,
    })

    await checkBaseRewardPool({
      address: system.muKglRewards,
      providerOrSigner: ethers.provider,
      name: 'muKglRewards',
    })

    await checkMuuuRewardPool({
      address: system.muuuRewards,
      providerOrSigner: ethers.provider,
    })

    // await checkPoolManager({
    //   address: system.poolManager,
    //   providerOrSigner: ethers.provider,
    // })

    await checkPoolManagerProxy({
      address: system.poolManagerProxy,
      providerOrSigner: ethers.provider,
    })
    await checkPoolManagerSecondaryProxy({
      address: system.poolManagerSecondaryProxy,
      providerOrSigner: ethers.provider,
    })
    await checkPoolManagerV3({
      address: system.poolManagerV3,
      providerOrSigner: ethers.provider,
    })

    // await checkArbitratorVault({
    //   address: system.arbitratorVault,
    //   providerOrSigner: ethers.provider,
    // })

    await checkMuuuLockerV2({
      address: system.muuuLockerV2,
      providerOrSigner: ethers.provider,
    })

    await checkMuuuStakingProxyV2({
      address: system.muuuStakingProxyV2,
      providerOrSigner: ethers.provider,
    })

    await checkPreminedMuuu({
      address: system.muuu,
      providerOrSigner: ethers.provider,
      treasuryAddress: system.treasury,
    })

    await checkBoosterOwner({
      address: system.boosterOwner,
      providerOrSigner: ethers.provider,
    })

    await checkTreasuryFunds({
      address: system.treasury,
      providerOrSigner: ethers.provider,
    })

    console.log(`------- END -------`)
  },
)
