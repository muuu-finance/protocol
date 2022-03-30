import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { deployKglDepositor } from '../../helpers/contracts-deploy-helpers'
import { loadConstants } from '../constants'
import { ContractJsonGroups, ContractKeys, TaskUtils } from '../utils'

const CONTRACT_KEY = ContractKeys.KglDepositor
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

      // get constants / addresses / parameters
      const deployeds = TaskUtils.loadDeployedContractAddresses({
        network: network.name,
      })
      const constants = loadConstants({
        network: network.name,
        isUseMocks: true, // temp
      })

      console.log(`> start deploy ${CONTRACT_KEY}`)

      const instance = await deployKglDepositor({
        deployer: _deployer,
        staker: deployeds.system.voteProxy,
        minter: deployeds.system.muKgl,
        kgl: constants.tokens.KGL,
        votingEscrow: constants.kaglas.votingEscrow,
      })
      TaskUtils.writeContractAddress({
        group: ContractJsonGroups.system,
        name: 'kglDepositor',
        value: instance.address,
        fileName: TaskUtils.getFilePath({ network: network.name }),
      })

      console.log(`>> deployed ${CONTRACT_KEY}\n`)

      if (!inMultiDeploymentFlow)
        console.log(`--- [deploy-${CONTRACT_KEY}] FINISHED ---`)
      return instance.address
    },
  )
