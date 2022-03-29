import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { ContractKeys } from '../utils'

task(
  `deploy-${ContractKeys.KaglaVoterProxy}`,
  `Deploy ${ContractKeys.KaglaVoterProxy}`,
)
  .addFlag('inMultiDeploymentFlow', 'Whether in a flow to multi deployments')
  .addFlag(
    'useAlreadyDeployed',
    'Use already deployed contracts, get addresses from json to have deployed contract addresses',
  )
  .setAction(
    async (
      {
        inMultiDeploymentFlow,
        useAlreadyDeployed,
      }: { inMultiDeploymentFlow: boolean; useAlreadyDeployed: boolean },
      hre: HardhatRuntimeEnvironment,
    ) => {
      !inMultiDeploymentFlow &&
        console.log(`--- [deploy-${ContractKeys.KaglaVoterProxy}] START ---`)
      !inMultiDeploymentFlow &&
        console.log(`useAlreadyDeployed flag: ${useAlreadyDeployed}`)
      console.log(`> start deploy ${ContractKeys.KaglaVoterProxy}`)
      console.log(`> deployed ${ContractKeys.KaglaVoterProxy}`)
      !inMultiDeploymentFlow &&
        console.log(`--- [deploy-${ContractKeys.KaglaVoterProxy}] FINISHED ---`)
    },
  )
