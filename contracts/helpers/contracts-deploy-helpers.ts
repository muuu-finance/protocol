import { Contract, ContractTransaction, Signer } from "ethers"
import { ContractKeys } from "../tasks/utils";
import { Booster__factory, KaglaVoterProxy__factory, MuuuToken__factory } from '../types'

const waitForTx = async (tx: ContractTransaction) => await tx.wait(1);
const loggingDeployedContract = (id: string, instance: Contract) => {
  console.log(`\n*** ${id} ***`);
  console.log(`tx: ${instance.deployTransaction.hash}`);
  console.log(`contract address: ${instance.address}`);
  console.log(`deployer address: ${instance.deployTransaction.from}`);
  console.log(`gas price: ${instance.deployTransaction.gasPrice}`);
  console.log(`gas used: ${instance.deployTransaction.gasLimit}`);
  console.log(`******\n`);
}

const withSaveAndVerify = async <ContractType extends Contract>(
  instance: ContractType,
  id: string,
  // args: (string | string[])[],
  // verify?: boolean
): Promise<ContractType> => {
  await waitForTx(instance.deployTransaction);
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
  tokenMinter
}: DeployCommonArgs & {
  kgl: string,
  votingEscrow: string,
  gaugeController: string,
  tokenMinter: string
}) => withSaveAndVerify(
  await new KaglaVoterProxy__factory(deployer).deploy(
    kgl, votingEscrow, gaugeController, tokenMinter
  ),
  ContractKeys.KaglaVoterProxy
)

export const deployMuuuToken = async ({
  deployer,
  proxy,
}: DeployCommonArgs & {
  proxy: string
}) => withSaveAndVerify(
  await new MuuuToken__factory(deployer).deploy(
    proxy
  ),
  ContractKeys.MuuuToken
)

export const deployBooster = async ({
  deployer,
  staker,
  minter,
  kgl,
  registry
}: DeployCommonArgs & {
  staker: string
  minter: string
  kgl: string
  registry: string
}) => withSaveAndVerify(
  await new Booster__factory(deployer).deploy(
    staker,
    minter,
    kgl,
    registry
  ),
  ContractKeys.Booster
)


