import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { BigNumber } from 'ethers'
import fs from 'fs'
import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import {
  Booster__factory,
  ClaimZap__factory,
  KaglaVoterProxy__factory,
  KglDepositor__factory,
  MerkleAirdropFactory__factory,
  MerkleAirdrop__factory,
  MuKglToken__factory,
  MuuuToken__factory,
  VestedEscrow__factory,
} from '../../types'
import { loadConstants } from '../constants'
import { DeployedContractAddresses } from '../types'
import { ContractJsonGroups, ContractKeys, TaskUtils } from '../utils'

// Functions
// -- Procedures
const _transferOwnershipInVoterProxy = async ({
  signer,
  adminAddress,
  kaglaVoterProxyAddress,
}: {
  signer: SignerWithAddress
  adminAddress: string
  kaglaVoterProxyAddress: string
}) => {
  const voterProxy = KaglaVoterProxy__factory.connect(
    kaglaVoterProxyAddress,
    signer,
  )
  const currentOwner = await voterProxy.owner()
  if (currentOwner != adminAddress) {
    console.log('> KaglaVoterProxy#transferOwnership')
    await voterProxy.transferOwnership(adminAddress, { from: currentOwner })
  }
}

const _mintMuuuToken = async ({
  signer,
  muuuTokenAddress,
  amount,
}: {
  signer: SignerWithAddress
  muuuTokenAddress: string
  amount: BigNumber
}) => {
  console.log('> MuuuToken#mint')
  await MuuuToken__factory.connect(muuuTokenAddress, signer).mint(
    signer.address,
    amount.toString(),
  )
}

// contracts/migrations/1_deploy_contracts.js#L251-255
const _prepareAfterDeployingKglDepositor = async ({
  signer,
  addresses,
}: {
  signer: SignerWithAddress
  addresses: {
    kaglaVoterProxy: string
    booster: string
    muKglToken: string
    kglDepositor: string
  }
}) => {
  const { kaglaVoterProxy, booster, muKglToken, kglDepositor } = addresses
  console.log('> MuKglToken#setOperator')
  await MuKglToken__factory.connect(muKglToken, signer).setOperator(
    kglDepositor,
  )
  console.log('> KaglaVoterProxy#setDepositor')
  await KaglaVoterProxy__factory.connect(kaglaVoterProxy, signer).setDepositor(
    kglDepositor,
  )
  console.log('> KglDepositor#initialLock')
  await KglDepositor__factory.connect(kglDepositor, signer).initialLock()
  console.log('> Booster#setTreasury')
  await Booster__factory.connect(booster, signer).setTreasury(kglDepositor)
}

// contracts/migrations/1_deploy_contracts.js#L284-286
const _setRewardContractsToBooster = async ({
  signer,
  addresses,
}: {
  signer: SignerWithAddress
  addresses: {
    booster: string
    muKglRewardPool: string
    muuuRewardPool: string
  }
}) => {
  const { booster, muKglRewardPool, muuuRewardPool } = addresses
  console.log('> Booster#setRewardContracts')
  await Booster__factory.connect(booster, signer).setRewardContracts(
    muKglRewardPool,
    muuuRewardPool,
  )
}

// contracts/migrations/1_deploy_contracts.js#L299-308
const _prepareAfterDeployingPoolManager = async ({
  signer,
  addresses,
}: {
  signer: SignerWithAddress
  addresses: {
    booster: string
    poolManager: string
    rewardFactory: string
    tokenFactory: string
    stashFactory: string
  }
}) => {
  const { booster, poolManager, rewardFactory, tokenFactory, stashFactory } =
    addresses
  const _boosterInstance = await Booster__factory.connect(booster, signer)
  console.log('> Booster#setPoolManager')
  await _boosterInstance.setPoolManager(poolManager)
  console.log('> Booster#setFactories')
  await _boosterInstance.setFactories(rewardFactory, tokenFactory, stashFactory)
  console.log('> Booster#setFeeInfo')
  await _boosterInstance.setFeeInfo()
}

// contracts/migrations/1_deploy_contracts.js#L313
const _setArbitratorToBooster = async ({
  signer,
  addresses,
}: {
  signer: SignerWithAddress
  addresses: {
    booster: string
    arbitratorVault: string
  }
}) => {
  console.log('> Booster#setArbitrator')
  await Booster__factory.connect(addresses.booster, signer).setArbitrator(
    addresses.arbitratorVault,
  )
}

// contracts/migrations/1_deploy_contracts.js#L341
const _setApprovalsInClaimZap = async ({
  signer,
  claimZapAddress,
}: {
  signer: SignerWithAddress
  claimZapAddress: string
}) => {
  console.log('> ClaimZap#setApprovals')
  await ClaimZap__factory.connect(claimZapAddress, signer).setApprovals()
}

// contracts/migrations/1_deploy_contracts.js#L359-369
const _prepareAfterDeployingVestedEscrow = async ({
  signer,
  variables,
  addresses,
}: {
  signer: SignerWithAddress
  variables: {
    amount: BigNumber
    vestedAddresses: string[]
    vestedAmount: string[]
  }
  addresses: {
    muuuToken: string
    vestedEscrow: string
  }
}) => {
  await MuuuToken__factory.connect(addresses.muuuToken, signer).approve(
    addresses.vestedEscrow,
    variables.amount.toString(),
  )
  const vestedEscrowInstance = await VestedEscrow__factory.connect(
    addresses.vestedEscrow,
    signer,
  )
  console.log('> VestedEscrow#addTokens')
  await vestedEscrowInstance.addTokens(variables.amount)
  console.log('> VestedEscrow#fund')
  await vestedEscrowInstance.fund(
    variables.vestedAddresses,
    variables.vestedAmount,
  )
  console.log(
    `vesting unallocatedSupply: ${await vestedEscrowInstance.unallocatedSupply()}`,
  )
  console.log(
    `vesting initialLockedSupply: ${await vestedEscrowInstance.initialLockedSupply()}`,
  )
}

const _createMerkleAirdropFromFactory = async ({
  signer,
  networkName,
  merkleAirdropFactoryAddress,
}: {
  signer: SignerWithAddress
  networkName: string
  merkleAirdropFactoryAddress: string
}): Promise<string> => {
  console.log('> MerkleAirdropFactory#CreateMerkleAirdrop')

  // create MerkleAirdrop
  const tx = await MerkleAirdropFactory__factory.connect(
    merkleAirdropFactoryAddress,
    signer,
  ).CreateMerkleAirdrop()

  // get created MerkleAirdrop address
  const rc = await tx.wait()
  const merkleAirdropAddress = rc.events?.find(
    (event) => event.event === 'Created',
  )?.args?.drop
  if (!merkleAirdropAddress) {
    throw new Error(
      "Cannot get MerkleAirdrop's address from tx by MerkleAirdropFactory#CreateMerkleAirdrop",
    )
  }

  // write address to json
  TaskUtils.writeContractAddress({
    group: ContractJsonGroups.system,
    name: 'airdrop',
    value: merkleAirdropAddress,
    fileName: TaskUtils.getFilePath({ network: networkName }),
  })

  return merkleAirdropAddress
}

// contracts/migrations/1_deploy_contracts.js#L383-389
const _prepareAfterDeployingMerkleAirdrop = async ({
  signer,
  variables,
  addresses,
}: {
  signer: SignerWithAddress
  variables: {
    amount: BigNumber
    merkleRoot: string
  }
  addresses: {
    muuuToken: string
    merkleAirdrop: string
  }
}) => {
  const { muuuToken, merkleAirdrop } = addresses

  console.log('> MerkleAirdrop#setRewardToken')
  await MerkleAirdrop__factory.connect(merkleAirdrop, signer).setRewardToken(
    muuuToken,
  )

  const muuuTokenInstance = await MuuuToken__factory.connect(muuuToken, signer)
  console.log('> MuuuToken#transfer')
  await muuuTokenInstance.transfer(merkleAirdrop, variables.amount.toString())
  console.log(
    `airdrop balance: ${await muuuTokenInstance.balanceOf(merkleAirdrop)}`,
  )
  console.log('> MerkleAirdrop#setRoot')
  await MerkleAirdrop__factory.connect(merkleAirdrop, signer).setRoot(
    variables.merkleRoot,
  )
}
// -- Utilities
const isSkipDeploy = ({
  enableSkip,
  key,
  deployeds,
}: {
  enableSkip: string
  key: string
  deployeds: DeployedContractAddresses
}) => enableSkip && deployeds.system[key]

task(
  'all-required-developments',
  'Deploy minimum necessary contracts to specified network',
)
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
        useAlreadyDeployed: _useAlreadyDeployed,
        useMockContracts: _useMockContracts,
      }: { useAlreadyDeployed: boolean; useMockContracts: boolean },
      hre: HardhatRuntimeEnvironment,
    ) => {
      console.log(`--- [all-required-developments] START ---`)
      const { network, ethers } = hre
      console.log(`network: ${network.name}`)
      const [signer] = await ethers.getSigners()
      console.log(`deployer: ${await signer.getAddress()}`)
      console.log(`useMockContracts flag: ${_useMockContracts}`)
      console.log(`useAlreadyDeployed flag: ${_useAlreadyDeployed}`)
      if (_useAlreadyDeployed) {
        console.log(`[NOTE] use already deployed contracts`)
      } else {
        // reset json to have deployed contracts' addresses
        TaskUtils.resetContractAddressesJson({ network: network.name })
      }
      // Prepares
      const constants = loadConstants({
        network: network.name,
        isUseMocks: _useMockContracts,
      })
      const commonTaskArgs = {
        deployerAddress: signer.address,
        inMultiDeploymentFlow: true,
        useAlreadyDeployed: _useAlreadyDeployed,
        useMockContracts: _useMockContracts,
      }

      const adminAddress = signer.address // TODO: from constants
      const totalVested: BigNumber = constants.vested.amounts.reduce(
        (previousValue, currentValue) =>
          BigNumber.from(previousValue).add(BigNumber.from(currentValue)),
        BigNumber.from('0'),
      ) // calculate total amounts
      const vekglAmount = BigNumber.from(0) // TODO: from constants
      const mintAmount = totalVested.add(vekglAmount) // TODO: consider lpincentives, vecrv, teamcvxLpSeed?

      // DEBUG
      const json = `./contracts-${network.name}.json`
      if (!fs.existsSync(json))
        fs.writeFileSync(json, JSON.stringify({}, null, 2))
      console.log('> TaskUtils.loadDeployedContractAddresses')
      console.log(
        TaskUtils.loadDeployedContractAddresses({ network: network.name }),
      )
      if (_useMockContracts) {
        const mockJson = `./contract-mocks-${network.name}.json`
        if (!fs.existsSync(mockJson))
          fs.writeFileSync(mockJson, JSON.stringify({}, null, 2))
        console.log('> TaskUtils.loadDeployedMockAddresses')
        console.log(
          TaskUtils.loadDeployedMockAddresses({ network: network.name }),
        )
      }

      // Deployments
      // TODO: pass other addresses to tasks
      console.log(`--- start deployments & initialize / setups ---`)
      // TODO: consider about treasury
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
      await _transferOwnershipInVoterProxy({
        signer,
        adminAddress,
        kaglaVoterProxyAddress: kaglaVoterProxyAddress,
      })
      await _mintMuuuToken({
        signer,
        muuuTokenAddress: muuuTokenAddress,
        amount: mintAmount,
      })

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

      await _prepareAfterDeployingKglDepositor({
        signer,
        addresses: {
          kaglaVoterProxy: kaglaVoterProxyAddress,
          booster: boosterAddress,
          muKglToken: muKglTokenAddress,
          kglDepositor: kglDepositorAddress,
        },
      })

      const muKglRewardPoolAddress = await hre.run(
        `deploy-${ContractKeys.BaseRewardPool}`,
        commonTaskArgs,
      )
      const muuuRewardPoolAddress = await hre.run(
        `deploy-${ContractKeys.MuuuRewardPool}`,
        commonTaskArgs,
      )

      await _setRewardContractsToBooster({
        signer,
        addresses: {
          booster: boosterAddress,
          muKglRewardPool: muKglRewardPoolAddress,
          muuuRewardPool: muuuRewardPoolAddress,
        },
      })

      const poolManagerAddress = await hre.run(
        `deploy-${ContractKeys.PoolManager}`,
        commonTaskArgs,
      )

      await _prepareAfterDeployingPoolManager({
        signer,
        addresses: {
          booster: boosterAddress,
          poolManager: poolManagerAddress,
          rewardFactory: rewardFactoryAddress,
          tokenFactory: tokenFactoryAddress,
          stashFactory: stashFactoryAddress,
        },
      })

      const arbitratorVaultAddress = await hre.run(
        `deploy-${ContractKeys.ArbitratorVault}`,
        commonTaskArgs,
      )

      // contracts/migrations/1_deploy_contracts.js#L313
      await _setArbitratorToBooster({
        signer,
        addresses: {
          booster: boosterAddress,
          arbitratorVault: arbitratorVaultAddress,
        },
      })

      const muuuLockerV2Address = await hre.run(
        `deploy-${ContractKeys.MuuuLockerV2}`,
        commonTaskArgs,
      )
      const claimZapAddress = await hre.run(
        `deploy-${ContractKeys.ClaimZap}`,
        commonTaskArgs,
      )

      // contracts/migrations/1_deploy_contracts.js#L341
      await _setApprovalsInClaimZap({
        signer,
        claimZapAddress,
      })

      const vestedEscrowAddress = await hre.run(
        `deploy-${ContractKeys.VestedEscrow}`,
        commonTaskArgs,
      )

      // contracts/migrations/1_deploy_contracts.js#L359-369
      await _prepareAfterDeployingVestedEscrow({
        signer,
        variables: {
          amount: totalVested,
          vestedAddresses: constants.vested.addresses,
          vestedAmount: constants.vested.amounts,
        },
        addresses: {
          muuuToken: muuuTokenAddress,
          vestedEscrow: vestedEscrowAddress,
        },
      })

      const merkleAirdropFactoryAddress = await hre.run(
        `deploy-${ContractKeys.MerkleAirdropFactory}`,
        commonTaskArgs,
      )

      const merkleAirdropAddress = await _createMerkleAirdropFromFactory({
        signer,
        networkName: network.name,
        merkleAirdropFactoryAddress,
      })

      // contracts/migrations/1_deploy_contracts.js#L383-389
      await _prepareAfterDeployingMerkleAirdrop({
        signer,
        variables: {
          amount: vekglAmount,
          merkleRoot: constants.contracts.merkleAirdrop.merkleRoot,
        },
        addresses: {
          muuuToken: muuuTokenAddress,
          merkleAirdrop: merkleAirdropAddress,
        },
      })

      console.log(`--- finish deployments & initialize / setups ---`)

      // TODO: create pools

      console.log(`--- confirm addresses/pools ---`)
      console.log(
        TaskUtils.loadDeployedContractAddresses({ network: network.name }),
      )
      console.log(`--- [all-required-developments] FINISHED ---`)
    },
  )
