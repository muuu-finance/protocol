import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import {
  deployRewardFactory,
  deployStashFactory,
  deployTokenFactory,
} from '../../helpers/contracts-deploy-helpers'
import { ContractKeys } from '../utils'

const CONTRACT_KEY = 'FactoryContracts'
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

      console.log(`> start deploy ${ContractKeys.RewardFactory}`)
      const rFactoryInstance = await deployRewardFactory({
        deployer: _deployer,
        operator: ethers.constants.AddressZero, // TODO
        kgl: ethers.constants.AddressZero, // TODO
      })
      console.log(`>> deployed ${ContractKeys.RewardFactory}`)
      console.log(`> start deploy ${ContractKeys.TokenFactory}`)
      const tFactoryInstance = await deployTokenFactory({
        deployer: _deployer,
        operator: ethers.constants.AddressZero, // TODO
      })
      console.log(`>> deployed ${ContractKeys.TokenFactory}`)
      console.log(`> start deploy ${ContractKeys.StashFactory}`)
      const sFactoryInstance = await deployStashFactory({
        deployer: _deployer,
        operator: ethers.constants.AddressZero, // TODO
        rewardFactory: rFactoryInstance.address, // TODO
      })
      console.log(`>> deployed ${ContractKeys.StashFactory}`)

      if (!inMultiDeploymentFlow)
        console.log(`--- [deploy-${CONTRACT_KEY}] FINISHED ---`)
      return {
        rewardFactoryAddress: rFactoryInstance.address,
        tokenFactoryAddress: tFactoryInstance.address,
        stashFactoryAddress: sFactoryInstance.address,
      }
    },
  )
