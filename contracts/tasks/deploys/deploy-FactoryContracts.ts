import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import {
  deployProxyFactory,
  deployRewardFactory,
  deployStashFactoryV2,
  deployTokenFactory,
} from '../../helpers/contracts-deploy-helpers'
import { loadConstants } from '../constants'
import { ContractJsonGroups, ContractKeys, TaskUtils } from '../utils'

const CONTRACT_KEY = 'FactoryContracts'
task(`deploy-${CONTRACT_KEY}`, `Deploy ${CONTRACT_KEY}`)
  .addOptionalParam('deployerAddress', "Deployer's address")
  .addFlag('inMultiDeploymentFlow', 'Whether in a flow to multi deployments')
  .addFlag(
    'useAlreadyDeployed',
    'Use already deployed contracts, get addresses from json to have deployed contract addresses',
  )
  .addFlag(
    'useMockContracts',
    'Use mock contracts, get addresses from json to mock contract addresses',
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

      console.log(`> start deploy ${ContractKeys.RewardFactory}`)
      const rFactoryInstance = await deployRewardFactory({
        deployer: _deployer,
        operator: deployeds.system.booster,
        kgl: constants.tokens.KGL,
      })
      TaskUtils.writeContractAddress({
        group: ContractJsonGroups.system,
        name: 'rFactory',
        value: rFactoryInstance.address,
        fileName: TaskUtils.getFilePath({ network: network.name }),
      })
      console.log(`>> deployed ${ContractKeys.RewardFactory}\n`)

      console.log(`> start deploy ${ContractKeys.TokenFactory}`)
      const tFactoryInstance = await deployTokenFactory({
        deployer: _deployer,
        operator: deployeds.system.booster,
      })
      TaskUtils.writeContractAddress({
        group: ContractJsonGroups.system,
        name: 'tFactory',
        value: tFactoryInstance.address,
        fileName: TaskUtils.getFilePath({ network: network.name }),
      })
      console.log(`>> deployed ${ContractKeys.TokenFactory}\n`)

      console.log(`> start deploy ${ContractKeys.ProxyFactory}`)
      const proxyFactory = await deployProxyFactory({ deployer: _deployer })
      TaskUtils.writeContractAddress({
        group: ContractJsonGroups.system,
        name: 'proxyFactory',
        value: proxyFactory.address,
        fileName: TaskUtils.getFilePath({ network: network.name }),
      })
      console.log(`>> deployed ${ContractKeys.ProxyFactory}\n`)

      console.log(`> start deploy ${ContractKeys.StashFactoryV2}`)
      const sFactoryInstance = await deployStashFactoryV2({
        deployer: _deployer,
        operator: deployeds.system.booster,
        rewardFactory: rFactoryInstance.address,
        proxyFactory: proxyFactory.address
      })
      TaskUtils.writeContractAddress({
        group: ContractJsonGroups.system,
        name: 'sFactory',
        value: sFactoryInstance.address,
        fileName: TaskUtils.getFilePath({ network: network.name }),
      })
      console.log(`>> deployed ${ContractKeys.StashFactoryV2}\n`)

      if (!inMultiDeploymentFlow)
        console.log(`--- [deploy-${CONTRACT_KEY}] FINISHED ---`)
      return {
        rewardFactoryAddress: rFactoryInstance.address,
        tokenFactoryAddress: tFactoryInstance.address,
        stashFactoryAddress: sFactoryInstance.address,
      }
    },
  )
