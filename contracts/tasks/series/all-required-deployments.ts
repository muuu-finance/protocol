import fs from 'fs'
import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { ContractKeys, TaskUtils } from '../utils'

task(
  'all-required-developments',
  'Deploy minimum necessary contracts to specified network',
)
  .addFlag(
    'useAlreadyDeployed',
    'Use already deployed contracts, get addresses from json to have deployed contract addresses',
  )
  .setAction(
    async (
      { useAlreadyDeployed }: { useAlreadyDeployed: boolean },
      hre: HardhatRuntimeEnvironment,
    ) => {
      console.log(`--- [all-required-developments] START ---`)
      const { network, ethers } = hre
      console.log(`network: ${network.name}`)
      const [signer] = await ethers.getSigners()
      console.log(`deployer: ${await signer.getAddress()}`)
      console.log(`useAlreadyDeployed flag: ${useAlreadyDeployed}`)
      if (useAlreadyDeployed) {
        console.log(`[NOTE] use already deployed contracts`)
      }

      // DEBUG
      const json = `./contracts-${network.name}.json`
      if (!fs.existsSync(json))
        fs.writeFileSync(json, JSON.stringify({}, null, 2))
      console.log('> TaskUtils.loadDeployedContractAddresses')
      console.log(TaskUtils.loadDeployedContractAddresses(network.name))
      const mockJson = `./contract-mocks-${network.name}.json`
      if (!fs.existsSync(mockJson))
        fs.writeFileSync(mockJson, JSON.stringify({}, null, 2))
      console.log('> TaskUtils.loadDeployedMockAddresses')
      console.log(TaskUtils.loadDeployedMockAddresses(network.name))

      await hre.run(`deploy-contracts`)
      await hre.run(`deploy-${ContractKeys.KaglaVoterProxy}`, {
        inMultiDeploymentFlow: true,
        useAlreadyDeployed: useAlreadyDeployed,
      })

      console.log(`--- [all-required-developments] FINISHED ---`)
    },
  )
