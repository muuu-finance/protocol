import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { deployKaglaVoterProxy } from '../../helpers/contracts-deploy-helpers'
import { ContractKeys } from '../utils'

const CONTRACT_KEY = ContractKeys.KaglaVoterProxy
task(`deploy-${CONTRACT_KEY}`, `Deploy ${CONTRACT_KEY}`)
  .addOptionalParam('deployerAddress', "Deployer's address")
  .addFlag('inMultiDeploymentFlow', 'Whether in a flow to multi deployments')
  .addFlag(
    'useAlreadyDeployed',
    'Use already deployed contracts, get addresses from json to have deployed contract addresses',
  )
  .setAction(
    async (
      {
        deployerAddress,
        inMultiDeploymentFlow,
        useAlreadyDeployed,
      }: {
        deployerAddress: string
        inMultiDeploymentFlow: boolean
        useAlreadyDeployed: boolean
      },
      hre: HardhatRuntimeEnvironment,
    ) => {
      const { network, ethers } = hre
      const _deployer =
        (await ethers.getSigner(deployerAddress)) ||
        (await ethers.getSigners())[0]
      if (!inMultiDeploymentFlow) {
        console.log(`--- [deploy-${CONTRACT_KEY}] START ---`)
        console.log(`network: ${network.name}`)
        console.log(`useAlreadyDeployed flag: ${useAlreadyDeployed}`)
      }

      console.log(`> start deploy ${CONTRACT_KEY}`)
      const instance = await deployKaglaVoterProxy({
        deployer: _deployer,
        kgl: ethers.constants.AddressZero, // TODO
        votingEscrow: ethers.constants.AddressZero, // TODO
        gaugeController: ethers.constants.AddressZero, // TODO
        tokenMinter: ethers.constants.AddressZero, // TODO
      })
      // TaskUtils.writeContractAddress(
      //   ContractJsonGroups.system,
      //   'voteProxy',
      //   instance.address,
      //   TaskUtils.getFilePath({ network: network.name }),
      // )

      console.log(`>> deployed ${CONTRACT_KEY}\n`)

      if (!inMultiDeploymentFlow)
        console.log(`--- [deploy-${CONTRACT_KEY}] FINISHED ---`)
      return instance.address
    },
  )
