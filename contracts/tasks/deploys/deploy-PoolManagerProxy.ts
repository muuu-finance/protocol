import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { deployPoolManagerProxy, deployPoolManagerSecondaryProxy, deployPoolManagerV3 } from '../../helpers/contracts-deploy-helpers'
import { MockGaugeController__factory } from '../../types'
import { loadConstants } from '../constants'
import { ContractJsonGroups, ContractKeys, TaskUtils } from '../utils'

const CONTRACT_KEY = ContractKeys.PoolManagerProxy
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
      console.log(`> start deploy ${CONTRACT_KEY}`)

      // get constants / addresses / parameters
      const deployeds = TaskUtils.loadDeployedContractAddresses({
        network: network.name,
      })
      const constants = loadConstants({
        network: network.name,
        isUseMocks: useMockContracts,
      })

      console.log(`--- start: deployments ---`)
      const poolManagerProxy = await deployPoolManagerProxy({
        deployer: _deployer,
        pools: deployeds.system.booster
      })
      TaskUtils.writeContractAddress({
        group: ContractJsonGroups.system,
        name: 'poolManagerProxy',
        value: poolManagerProxy.address,
        fileName: TaskUtils.getFilePath({ network: network.name }),
      })

      const poolManagerSecondaryProxy = await deployPoolManagerSecondaryProxy({
        deployer: _deployer,
        gaugeController: constants.kaglas.gauge,
        pools: poolManagerProxy.address,
        booster: deployeds.system.booster
      })
      TaskUtils.writeContractAddress({
        group: ContractJsonGroups.system,
        name: 'poolManagerSecondaryProxy',
        value: poolManagerSecondaryProxy.address,
        fileName: TaskUtils.getFilePath({ network: network.name }),
      })

      const poolManagerV3 = await deployPoolManagerV3({
        deployer: _deployer,
        gaugeController: constants.kaglas.gauge,
        pools: poolManagerSecondaryProxy.address
      })
      TaskUtils.writeContractAddress({
        group: ContractJsonGroups.system,
        name: 'poolManagerV3',
        value: poolManagerV3.address,
        fileName: TaskUtils.getFilePath({ network: network.name }),
      })
      console.log(`--- finish: deployments ---`)

      console.log(`--- start: initialize / setups ---`)
      console.log(`> PoolManagerProxy#setOperator`)
      await poolManagerProxy.setOperator(poolManagerSecondaryProxy.address)
      console.log(`> PoolManagerSecondaryProxy#setOperator`)
      await poolManagerSecondaryProxy.setOperator(poolManagerV3.address)
      console.log(`--- finish: initialize / setups ---`)

      console.log(`>> deployed ${CONTRACT_KEY}\n`)

      if (!inMultiDeploymentFlow)
        console.log(`--- [deploy-${CONTRACT_KEY}] FINISHED ---`)
      return {
        poolManagerAddress: poolManagerV3.address,
        poolManagerProxyAddress: poolManagerProxy.address
      }
    },
  )
