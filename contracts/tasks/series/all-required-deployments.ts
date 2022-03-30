import fs from 'fs'
import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import {
  Booster__factory,
  KaglaVoterProxy__factory,
  KglDepositor__factory,
  MerkleAirdropFactory__factory,
  MerkleAirdrop__factory,
  MuKglToken__factory,
  MuuuToken__factory,
  VestedEscrow__factory,
} from '../../types'
import { loadConstants } from '../constants'
import { ContractJsonGroups, ContractKeys, TaskUtils } from '../utils'

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
      } else {
        // reset json to have deployed contracts' addresses
        TaskUtils.resetContractAddressesJson({ network: network.name })
      }

      // DEBUG
      const json = `./contracts-${network.name}.json`
      if (!fs.existsSync(json))
        fs.writeFileSync(json, JSON.stringify({}, null, 2))
      console.log('> TaskUtils.loadDeployedContractAddresses')
      console.log(
        TaskUtils.loadDeployedContractAddresses({ network: network.name }),
      )
      const mockJson = `./contract-mocks-${network.name}.json`
      if (!fs.existsSync(mockJson))
        fs.writeFileSync(mockJson, JSON.stringify({}, null, 2))
      console.log('> TaskUtils.loadDeployedMockAddresses')
      console.log(
        TaskUtils.loadDeployedMockAddresses({ network: network.name }),
      )

      // Deployments
      // TODO: pass other addresses to tasks
      const constants = loadConstants({
        network: network.name,
        isUseMocks: true, // temp
      })

      const commonTaskArgs = {
        deployerAddress: signer.address,
        inMultiDeploymentFlow: true,
        useAlreadyDeployed: useAlreadyDeployed,
      }

      TaskUtils.writeContractAddress({
        group: ContractJsonGroups.system,
        name: 'treasury',
        value: constants.contracts.treasury.address,
        fileName: TaskUtils.getFilePath({ network: network.name }),
      })
      const kaglaVoterProxyAddress = await hre.run(
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
        kaglaVoterProxyAddress,
        signer,
      )
      const currentOwner = await voterProxy.owner()
      if (currentOwner != admin) {
        console.log('> KaglaVoterProxy#transferOwnership')
        await voterProxy.transferOwnership(admin, { from: currentOwner })
      }
      console.log('> MuuuToken#mint')
      await MuuuToken__factory.connect(muuuTokenAddress, signer).mint(
        signer.address,
        ethers.utils.parseEther('10000.0').toString(), // TODO
      )

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
      await MuKglToken__factory.connect(muKglTokenAddress, signer).setOperator(
        kglDepositorAddress,
      )
      console.log('> KaglaVoterProxy#setDepositor')
      await KaglaVoterProxy__factory.connect(
        voterProxy.address,
        signer,
      ).setDepositor(kglDepositorAddress)
      console.log('> KglDepositor#initialLock')
      await KglDepositor__factory.connect(
        kglDepositorAddress,
        signer,
      ).initialLock()
      console.log('> Booster#setTreasury')
      await Booster__factory.connect(boosterAddress, signer).setTreasury(
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

      // contracts/migrations/1_deploy_contracts.js#L284-286
      console.log('> Booster#setRewardContracts')
      await Booster__factory.connect(boosterAddress, signer).setRewardContracts(
        muKglRewardPoolAddress,
        muuuRewardPoolAddress,
      )

      const poolManagerAddress = await hre.run(
        `deploy-${ContractKeys.PoolManager}`,
        commonTaskArgs,
      )

      // contracts/migrations/1_deploy_contracts.js#L299-308
      console.log('> Booster#setPoolManager')
      await Booster__factory.connect(boosterAddress, signer).setPoolManager(
        poolManagerAddress,
      )
      console.log('> Booster#setFactories')
      await Booster__factory.connect(boosterAddress, signer).setFactories(
        rewardFactoryAddress,
        tokenFactoryAddress,
        stashFactoryAddress,
      )
      console.log('> [temp skip] Booster#setFeeInfo')
      // await Booster__factory.connect(boosterAddress, signer).setFeeInfo()

      const arbitratorVaultAddress = await hre.run(
        `deploy-${ContractKeys.ArbitratorVault}`,
        commonTaskArgs,
      )

      // contracts/migrations/1_deploy_contracts.js#L313
      console.log('> Booster#setArbitrator')
      await Booster__factory.connect(boosterAddress, signer).setArbitrator(
        arbitratorVaultAddress,
      )

      const muuuLockerV2Address = await hre.run(
        `deploy-${ContractKeys.MuuuLockerV2}`,
        commonTaskArgs,
      )
      const claimZapAddress = await hre.run(
        `deploy-${ContractKeys.ClaimZap}`,
        commonTaskArgs,
      )

      // contracts/migrations/1_deploy_contracts.js#L341
      console.log('> [temp skip] ClaimZap#setApprovals')
      // await ClaimZap__factory.connect(claimZapAddress, signer).setApprovals()

      const vestedEscrowAddress = await hre.run(
        `deploy-${ContractKeys.VestedEscrow}`,
        commonTaskArgs,
      )

      // contracts/migrations/1_deploy_contracts.js#L359-369
      const total = 10000
      await MuuuToken__factory.connect(muuuTokenAddress, signer).approve(
        vestedEscrowAddress,
        total,
      )
      const vestedEscrowInstance = await VestedEscrow__factory.connect(
        vestedEscrowAddress,
        signer,
      )
      console.log('> [temp skip] VestedEscrow#addTokens')
      // await vestedEscrowInstance.addTokens(total)
      console.log('> VestedEscrow#fund')
      await vestedEscrowInstance.fund([], [])
      console.log(
        `vesting unallocatedSupply: ${await vestedEscrowInstance.unallocatedSupply()}`,
      )
      console.log(
        `vesting initialLockedSupply: ${await vestedEscrowInstance.initialLockedSupply()}`,
      )

      const merkleAirdropFactoryAddress = await hre.run(
        `deploy-${ContractKeys.MerkleAirdropFactory}`,
        commonTaskArgs,
      )

      console.log('> MerkleAirdropFactory#CreateMerkleAirdrop')
      const tx = await MerkleAirdropFactory__factory.connect(
        merkleAirdropFactoryAddress,
        signer,
      ).CreateMerkleAirdrop()
      const rc = await tx.wait()
      const merkleAirdropAddress = rc.events?.find(
        (event) => event.event === 'Created',
      )?.args?.drop
      if (!merkleAirdropAddress) {
        throw new Error(
          "Cannot get MerkleAirdrop's address from tx by MerkleAirdropFactory#CreateMerkleAirdrop",
        )
      }
      TaskUtils.writeContractAddress({
        group: ContractJsonGroups.system,
        name: 'airdrop',
        value: merkleAirdropAddress,
        fileName: TaskUtils.getFilePath({ network: network.name }),
      })

      // contracts/migrations/1_deploy_contracts.js#L383-389
      console.log('> MerkleAirdrop#setRewardToken')
      await MerkleAirdrop__factory.connect(
        merkleAirdropAddress,
        signer,
      ).setRewardToken(muuuTokenAddress)

      const muuuTokenInstance = await MuuuToken__factory.connect(
        muuuTokenAddress,
        signer,
      )
      console.log('> [temp skip] MuuuToken#transfer')
      // await muuuTokenInstance.transfer(merkleAirdropAddress, 10000) // TODO
      console.log(
        `airdrop balance: ${await muuuTokenInstance.balanceOf(
          merkleAirdropAddress,
        )}`,
      )
      const merkleRoot =
        '0x632a2ad201c5b95d3f75c1332afdcf489d4e6b4b7480cf878d8eba2aa87d5f73'
      console.log('> [temp skip] MerkleAirdrop#setRoot')
      await MerkleAirdrop__factory.connect(
        merkleAirdropAddress,
        signer,
      ).setRoot(merkleRoot)

      // TODO: create pools

      console.log(`--- [all-required-developments] FINISHED ---`)
    },
  )
