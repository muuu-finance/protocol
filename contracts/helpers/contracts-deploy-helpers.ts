import { Contract, ContractTransaction, Signer } from 'ethers'
import { ContractKeys } from '../tasks/utils'
import {
  ArbitratorVault__factory,
  BaseRewardPool__factory,
  BoosterOwner__factory,
  Booster__factory,
  ClaimZap__factory,
  ExtraRewardStashV3__factory,
  KaglaVoterProxy__factory,
  KglDepositor__factory,
  MerkleAirdropFactory__factory,
  MuKglToken__factory,
  MuuuLockerV2__factory,
  MuuuRewardPool__factory,
  MuuuStakingProxyV2__factory,
  MuuuToken__factory,
  PoolManagerProxy__factory,
  PoolManagerSecondaryProxy__factory,
  PoolManagerV3__factory,
  ProxyFactory__factory,
  RewardFactory__factory,
  StashFactoryV2__factory,
  TokenFactory__factory,
  TreasuryFunds__factory,
  VestedEscrow__factory,
} from '../types'

const waitForTx = async (tx: ContractTransaction) => await tx.wait(1)
const loggingDeployedContract = (id: string, instance: Contract) => {
  console.log(`\n*** ${id} ***`)
  console.log(`tx: ${instance.deployTransaction.hash}`)
  console.log(`contract address: ${instance.address}`)
  console.log(`deployer address: ${instance.deployTransaction.from}`)
  console.log(`gas price: ${instance.deployTransaction.gasPrice}`)
  console.log(`gas used: ${instance.deployTransaction.gasLimit}`)
  console.log(`******\n`)
}

const withSaveAndVerify = async <ContractType extends Contract>(
  instance: ContractType,
  id: string,
  // args: (string | string[])[],
  // verify?: boolean
): Promise<ContractType> => {
  await waitForTx(instance.deployTransaction)
  // TODO: write address to json
  loggingDeployedContract(id, instance)
  // if (verify) {} // TODO: verify contract
  return instance
}

type DeployCommonArgs = {
  deployer: Signer
  verify?: boolean
}

export const deployTreasuryFunds = async ({
  deployer,
  operator,
}: DeployCommonArgs & {
  operator: string
}) =>
  withSaveAndVerify(
    await new TreasuryFunds__factory(deployer).deploy(operator),
    ContractKeys.TreasuryFunds,
  )

export const deployKaglaVoterProxy = async ({
  deployer,
  kgl,
  votingEscrow,
  gaugeController,
  tokenMinter,
}: DeployCommonArgs & {
  kgl: string
  votingEscrow: string
  gaugeController: string
  tokenMinter: string
}) =>
  withSaveAndVerify(
    await new KaglaVoterProxy__factory(deployer).deploy(
      kgl,
      votingEscrow,
      gaugeController,
      tokenMinter,
    ),
    ContractKeys.KaglaVoterProxy,
  )

export const deployMuuuToken = async ({ deployer }: DeployCommonArgs) =>
  withSaveAndVerify(
    await new MuuuToken__factory(deployer).deploy(),
    ContractKeys.MuuuToken,
  )

export const deployBooster = async ({
  deployer,
  staker,
  minter,
  kgl,
  registry,
}: DeployCommonArgs & {
  staker: string
  minter: string
  kgl: string
  registry: string
}) =>
  withSaveAndVerify(
    await new Booster__factory(deployer).deploy(staker, minter, kgl, registry),
    ContractKeys.Booster,
  )

export const deployBoosterOwner = async ({
  deployer,
  booster,
  stashFactory,
  rescueStash,
  poolManager,
}: DeployCommonArgs & {
  booster: string
  stashFactory: string
  rescueStash: string
  poolManager: string
}) =>
  withSaveAndVerify(
    await new BoosterOwner__factory(deployer).deploy(
      booster,
      stashFactory,
      rescueStash,
      poolManager,
    ),
    ContractKeys.BoosterOwner,
  )

export const deployRewardFactory = async ({
  deployer,
  operator,
  kgl,
}: DeployCommonArgs & {
  operator: string
  kgl: string
}) =>
  withSaveAndVerify(
    await new RewardFactory__factory(deployer).deploy(operator, kgl),
    ContractKeys.RewardFactory,
  )

export const deployTokenFactory = async ({
  deployer,
  operator,
}: DeployCommonArgs & {
  operator: string
}) =>
  withSaveAndVerify(
    await new TokenFactory__factory(deployer).deploy(operator),
    ContractKeys.TokenFactory,
  )

export const deployStashFactoryV2 = async ({
  deployer,
  operator,
  rewardFactory,
  proxyFactory,
}: DeployCommonArgs & {
  operator: string
  rewardFactory: string
  proxyFactory: string
}) =>
  withSaveAndVerify(
    await new StashFactoryV2__factory(deployer).deploy(
      operator,
      rewardFactory,
      proxyFactory,
    ),
    ContractKeys.StashFactoryV2,
  )

export const deployProxyFactory = async ({ deployer }: DeployCommonArgs) =>
  withSaveAndVerify(
    await new ProxyFactory__factory(deployer).deploy(),
    ContractKeys.ProxyFactory,
  )

export const deployExtraRewardStashV3 = async ({
  deployer,
}: DeployCommonArgs) =>
  withSaveAndVerify(
    await new ExtraRewardStashV3__factory(deployer).deploy(),
    ContractKeys.ExtraRewardStashV3,
  )

export const deployMuKglToken = async ({ deployer }: DeployCommonArgs) =>
  withSaveAndVerify(
    await new MuKglToken__factory(deployer).deploy(),
    ContractKeys.MuKglToken,
  )

export const deployKglDepositor = async ({
  deployer,
  staker,
  minter,
  kgl,
  votingEscrow,
}: DeployCommonArgs & {
  staker: string
  minter: string
  kgl: string
  votingEscrow: string
}) =>
  withSaveAndVerify(
    await new KglDepositor__factory(deployer).deploy(
      staker,
      minter,
      kgl,
      votingEscrow,
    ),
    ContractKeys.KglDepositor,
  )

export const deployBaseRewardPool = async ({
  deployer,
  pid,
  stakingToken,
  rewardToken,
  operator,
  rewardManager,
}: DeployCommonArgs & {
  pid: number
  stakingToken: string
  rewardToken: string
  operator: string
  rewardManager: string
}) =>
  withSaveAndVerify(
    await new BaseRewardPool__factory(deployer).deploy(
      pid,
      stakingToken,
      rewardToken,
      operator,
      rewardManager,
    ),
    ContractKeys.BaseRewardPool,
  )

export const deployMuuuRewardPool = async ({
  deployer,
  stakingToken,
  rewardToken,
  kglDeposits,
  muKglRewards,
  muKglToken,
  operator,
  rewardManager,
}: DeployCommonArgs & {
  stakingToken: string
  rewardToken: string
  kglDeposits: string
  muKglRewards: string
  muKglToken: string
  operator: string
  rewardManager: string
}) =>
  withSaveAndVerify(
    await new MuuuRewardPool__factory(deployer).deploy(
      stakingToken,
      rewardToken,
      kglDeposits,
      muKglRewards,
      muKglToken,
      operator,
      rewardManager,
    ),
    ContractKeys.MuuuRewardPool,
  )

export const deployPoolManagerProxy = async ({
  deployer,
  pools,
}: DeployCommonArgs & {
  pools: string
}) =>
  withSaveAndVerify(
    await new PoolManagerProxy__factory(deployer).deploy(pools),
    ContractKeys.PoolManagerProxy,
  )

export const deployPoolManagerSecondaryProxy = async ({
  deployer,
  gaugeController,
  pools,
  booster,
}: DeployCommonArgs & {
  gaugeController: string
  pools: string
  booster: string
}) =>
  withSaveAndVerify(
    await new PoolManagerSecondaryProxy__factory(deployer).deploy(
      gaugeController,
      pools,
      booster,
    ),
    ContractKeys.PoolManagerSecondaryProxy,
  )

export const deployPoolManagerV3 = async ({
  deployer,
  pools,
  gaugeController,
}: DeployCommonArgs & {
  pools: string
  gaugeController: string
}) =>
  withSaveAndVerify(
    await new PoolManagerV3__factory(deployer).deploy(pools, gaugeController),
    ContractKeys.PoolManagerV3,
  )

export const deployArbitratorVault = async ({
  deployer,
  depositor,
}: DeployCommonArgs & {
  depositor: string
}) =>
  withSaveAndVerify(
    await new ArbitratorVault__factory(deployer).deploy(depositor),
    ContractKeys.ArbitratorVault,
  )

export const deployMuuuLockerV2 = async ({
  deployer,
  stakingToken,
  muKgl,
  boostPayment,
  mukglStaking,
}: DeployCommonArgs & {
  stakingToken: string
  muKgl: string
  boostPayment: string
  mukglStaking: string
}) =>
  withSaveAndVerify(
    await new MuuuLockerV2__factory(deployer).deploy(
      stakingToken,
      muKgl,
      boostPayment,
      mukglStaking,
    ),
    ContractKeys.MuuuLockerV2,
  )

export const deployMuuuStakingProxyV2 = async ({
  deployer,
  rewards,
  kgl,
  muuu,
  muKgl,
  muuuStaking,
  muKglStaking,
  kglDeposit,
}: DeployCommonArgs & {
  rewards: string
  kgl: string
  muuu: string
  muKgl: string
  muuuStaking: string
  muKglStaking: string
  kglDeposit: string
}) =>
  withSaveAndVerify(
    await new MuuuStakingProxyV2__factory(deployer).deploy(
      rewards,
      kgl,
      muuu,
      muKgl,
      muuuStaking,
      muKglStaking,
      kglDeposit,
    ),
    ContractKeys.MuuuStakingProxyV2,
  )

export const deployClaimZap = async ({
  deployer,
  booster,
  kgl,
  muuu,
  muKgl,
  kglDeposit,
  muKglRewards,
  muuuRewards,
  locker,
}: DeployCommonArgs & {
  booster: string
  kgl: string
  muuu: string
  muKgl: string
  kglDeposit: string
  muKglRewards: string
  muuuRewards: string
  locker: string
}) =>
  withSaveAndVerify(
    await new ClaimZap__factory(deployer).deploy(
      booster,
      kgl,
      muuu,
      muKgl,
      kglDeposit,
      muKglRewards,
      muuuRewards,
      locker,
    ),
    ContractKeys.ClaimZap,
  )

export const deployVestedEscrow = async ({
  deployer,
  rewardToken,
  starttime,
  endtime,
  stakeContract,
  fundAdmin,
}: DeployCommonArgs & {
  rewardToken: string
  starttime: string
  endtime: string
  stakeContract: string
  fundAdmin: string
}) =>
  withSaveAndVerify(
    await new VestedEscrow__factory(deployer).deploy(
      rewardToken,
      starttime,
      endtime,
      stakeContract,
      fundAdmin,
    ),
    ContractKeys.VestedEscrow,
  )

export const deployMerkleAirdropFactory = async ({
  deployer,
}: DeployCommonArgs) =>
  withSaveAndVerify(
    await new MerkleAirdropFactory__factory(deployer).deploy(),
    ContractKeys.MerkleAirdropFactory,
  )
