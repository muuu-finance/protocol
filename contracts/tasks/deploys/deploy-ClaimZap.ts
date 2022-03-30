import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { deployClaimZap } from '../../helpers/contracts-deploy-helpers'
import { loadConstants } from '../constants'
import { ContractJsonGroups, ContractKeys, TaskUtils } from '../utils'

const CONTRACT_KEY = ContractKeys.ClaimZap
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
        useMockContracts,
      }: {
        deployerAddress: string
        inMultiDeploymentFlow: boolean
        useAlreadyDeployed: boolean
        useMockContracts: boolean
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
        console.log(`useMockContracts flag: ${useMockContracts}`)
      }

      // get constants / addresses / parameters
      const deployeds = TaskUtils.loadDeployedContractAddresses({
        network: network.name,
      })
      const constants = loadConstants({
        network: network.name,
        isUseMocks: useMockContracts,
      })

      console.log(`> start deploy ${CONTRACT_KEY}`)

      const instance = await deployClaimZap({
        deployer: _deployer,
        kgl: constants.tokens.KGL,
        muuu: deployeds.system.muuu,
        muKgl: deployeds.system.muKgl,
        kglDeposit: deployeds.system.kglDepositor,
        muKglRewards: deployeds.system.muKglRewards,
        muuuRewards: deployeds.system.muuuRewards,
        exchange: constants.contracts.treasury.address,
        locker: deployeds.system.muuuLockerV2,
      })
      TaskUtils.writeContractAddress({
        group: ContractJsonGroups.system,
        name: 'claimZap',
        value: instance.address,
        fileName: TaskUtils.getFilePath({ network: network.name }),
      })
      console.log(`>> deployed ${CONTRACT_KEY}\n`)

      if (!inMultiDeploymentFlow)
        console.log(`--- [deploy-${CONTRACT_KEY}] FINISHED ---`)
      return instance.address
    },
  )
