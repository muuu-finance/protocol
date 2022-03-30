import { Contract, ContractTransaction, Signer } from 'ethers'
import { ContractKeys } from '../tasks/utils'
import {
  BaseRewardPool__factory,
  Booster__factory,
  KaglaVoterProxy__factory,
  KglDepositor__factory,
  MuKglToken__factory,
  MuuuRewardPool__factory,
  MuuuToken__factory,
  RewardFactory__factory,
  StashFactory__factory,
  TokenFactory__factory,
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

export const deployMuuuToken = async ({
  deployer,
  proxy,
}: DeployCommonArgs & {
  proxy: string
}) =>
  withSaveAndVerify(
    await new MuuuToken__factory(deployer).deploy(proxy),
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

export const deployStashFactory = async ({
  deployer,
  operator,
  rewardFactory,
}: DeployCommonArgs & {
  operator: string
  rewardFactory: string
}) =>
  withSaveAndVerify(
    await new StashFactory__factory(deployer).deploy(operator, rewardFactory),
    ContractKeys.StashFactory,
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
    ContractKeys.KaglaVoterProxy,
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
