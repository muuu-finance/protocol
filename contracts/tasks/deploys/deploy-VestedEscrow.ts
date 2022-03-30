import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { deployVestedEscrow } from '../../helpers/contracts-deploy-helpers'
import { ContractKeys } from '../utils'

const CONTRACT_KEY = ContractKeys.VestedEscrow
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
      const instance = await deployVestedEscrow({
        deployer: _deployer,
        rewardToken: ethers.constants.AddressZero, // TODO
        starttime: '0', // TODO
        endtime: '0', // TODO
        stakeContract: ethers.constants.AddressZero, // TODO
        fundAdmin: ethers.constants.AddressZero, // TODO
      })
      console.log(`>> deployed ${CONTRACT_KEY}\n`)

      if (!inMultiDeploymentFlow)
        console.log(`--- [deploy-${CONTRACT_KEY}] FINISHED ---`)
      return instance.address
    },
  )
