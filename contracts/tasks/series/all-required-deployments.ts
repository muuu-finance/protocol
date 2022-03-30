import fs from 'fs'
import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { KaglaVoterProxy__factory } from '../../types'
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

      // Deployments
      // TODO: pass other addresses to tasks

      const voterProxyAddress = await hre.run(
        `deploy-${ContractKeys.KaglaVoterProxy}`,
        {
          deployerAddress: signer.address,
          inMultiDeploymentFlow: true,
          useAlreadyDeployed: useAlreadyDeployed,
        },
      )
      const muuuTokenAddress = await hre.run(
        `deploy-${ContractKeys.MuuuToken}`,
        {
          deployerAddress: signer.address,
          inMultiDeploymentFlow: true,
          useAlreadyDeployed: useAlreadyDeployed,
        },
      )
      const boosterAddress = await hre.run(`deploy-${ContractKeys.Booster}`, {
        deployerAddress: signer.address,
        inMultiDeploymentFlow: true,
        useAlreadyDeployed: useAlreadyDeployed,
      })

      // contracts/migrations/1_deploy_contracts.js#L211-220
      const admin = signer.address // TODO
      const voterProxy = KaglaVoterProxy__factory.connect(
        voterProxyAddress,
        signer,
      )
      const currentOwner = await voterProxy.owner()
      if (currentOwner != admin) {
        voterProxy.transferOwnership(admin, { from: currentOwner })
      }
      // MuuuToken__factory.connect(muuuTokenAddress, signer)
      //   .mint(signer.address, ethers.utils.parseEther('10000.0').toString()) // TODO

      const { rewardFactoryAddress, tokenFactoryAddress, stashFactoryAddress } =
        await hre.run(`deploy-FactoryContracts`, {
          deployerAddress: signer.address,
          inMultiDeploymentFlow: true,
          useAlreadyDeployed: useAlreadyDeployed,
        })

      const muKglTokenAddress = await hre.run(
        `deploy-${ContractKeys.MuKglToken}`,
        {
          deployerAddress: signer.address,
          inMultiDeploymentFlow: true,
          useAlreadyDeployed: useAlreadyDeployed,
        },
      )

      console.log(`--- [all-required-developments] FINISHED ---`)
    },
  )
