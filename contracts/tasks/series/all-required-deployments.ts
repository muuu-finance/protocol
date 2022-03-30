import fs from 'fs'
import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import {
  Booster__factory,
  KaglaVoterProxy__factory,
  KglDepositor__factory,
  MuKglToken__factory,
} from '../../types'
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
      const commonTaskArgs = {
        deployerAddress: signer.address,
        inMultiDeploymentFlow: true,
        useAlreadyDeployed: useAlreadyDeployed,
      }

      const voterProxyAddress = await hre.run(
        `deploy-${ContractKeys.KaglaVoterProxy}`,
        commonTaskArgs,
      )
      const muuuTokenAddress = await hre.run(
        `deploy-${ContractKeys.MuuuToken}`,
        commonTaskArgs,
      )
      const boosterAddress = await hre.run(
        `deploy-${ContractKeys.Booster}`,
        commonTaskArgs,
      )

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
        await hre.run(`deploy-FactoryContracts`, commonTaskArgs)

      const muKglTokenAddress = await hre.run(
        `deploy-${ContractKeys.MuKglToken}`,
        commonTaskArgs,
      )

      const kglDepositorAddress = await hre.run(
        `deploy-${ContractKeys.KglDepositor}`,
        commonTaskArgs,
      )

      // contracts/migrations/1_deploy_contracts.js#L251-255
      console.log('> MuKglToken#setOperator')
      MuKglToken__factory.connect(muKglTokenAddress, signer).setOperator(
        kglDepositorAddress,
      )
      console.log('> KaglaVoterProxy#setDepositor')
      KaglaVoterProxy__factory.connect(voterProxy.address, signer).setDepositor(
        kglDepositorAddress,
      )
      console.log('> KglDepositor#initialLock')
      KglDepositor__factory.connect(kglDepositorAddress, signer).initialLock()
      console.log('> Booster#setTreasury')
      Booster__factory.connect(boosterAddress, signer).setTreasury(
        kglDepositorAddress,
      )

      const muKglRewardPoolAddress = await hre.run(
        `deploy-${ContractKeys.BaseRewardPool}`,
        commonTaskArgs,
      )

      const muuuRewardPoolAddress = await hre.run(
        `deploy-${ContractKeys.MuuuRewardPool}`,
        commonTaskArgs,
      )

      console.log(`--- [all-required-developments] FINISHED ---`)
    },
  )
