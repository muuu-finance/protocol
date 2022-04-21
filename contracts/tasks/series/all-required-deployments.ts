import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { BigNumber } from 'ethers'
import fs from 'fs'
import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { deployExtraRewardStashV3 } from '../../helpers/contracts-deploy-helpers'
import {
  Booster__factory,
  ClaimZap__factory,
  ERC20__factory,
  KaglaVoterProxy__factory,
  KglDepositor__factory,
  MerkleAirdropFactory__factory,
  MerkleAirdrop__factory,
  MuKglToken__factory,
  MuuuToken__factory,
  StashFactoryV2__factory,
  VestedEscrow__factory,
} from '../../types'
import { loadConstants } from '../constants'
import { DeployedContractAddresses } from '../types'
import { ContractJsonGroups, ContractKeys, TaskUtils } from '../utils'

// Functions
// -- Procedures
const _validateBeforeDeployments = async ({
  signer,
  kglToken,
  premine
}: {
  signer: SignerWithAddress
  kglToken: string
  premine: {
    total: string
    holders: { [key in string]: string }
  }
}): Promise<boolean> => {
  // check - deployer has kgl
  const kglBalance = await ERC20__factory.connect(kglToken, signer).balanceOf(signer.address)
  if (kglBalance.lte(0)) {
    console.log("[ERROR] Deployer has greater than 0 kgls")
    return false
  }
  const totalFromHolders = Object.values(premine.holders).reduce((pV, cV) => pV.add(BigNumber.from(cV)), BigNumber.from("0"))
  if (!BigNumber.from(premine.total).eq(totalFromHolders)) {
    console.log("[ERROR] Premine total does not match to calculated total from holders")
    return false
  }
  return true
}

const _transferOwnershipAndSetOperatorInVoterProxy = async ({
  signer,
  adminAddress,
  addresses,
}: {
  signer: SignerWithAddress
  adminAddress?: string
  addresses: {
    booster: string
    kaglaVoterProxy: string
  }
}) => {
  const voterProxy = KaglaVoterProxy__factory.connect(
    addresses.kaglaVoterProxy,
    signer,
  )
  const currentOwner = await voterProxy.owner()
  if (adminAddress && currentOwner != adminAddress) {
    console.log('> KaglaVoterProxy#transferOwnership')
    await (
      await voterProxy.transferOwnership(adminAddress, { from: currentOwner })
    ).wait()
  }
  console.log('> KaglaVoterProxy#setOperator')
  await (await voterProxy.setOperator(addresses.booster)).wait()
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
  const tx = await MuuuToken__factory.connect(muuuTokenAddress, signer).mint(
    signer.address,
    amount.toString(),
  )
  await tx.wait()
}

const _transferPreminedMuuuToken = async ({
  signer,
  muuuTokenAddress,
  premineHolders,
  treasuryAddress
}: {
  signer: SignerWithAddress
  muuuTokenAddress: string
  premineHolders: {
    deployer: string,
    treasury: string,
  }
  treasuryAddress: string
}) => {
  console.log('> MuuuToken#transfer (from deployer to treasury)')
  const tx = await MuuuToken__factory.connect(muuuTokenAddress, signer).transfer(treasuryAddress, premineHolders.treasury)
  await tx.wait()
}

const _addBoosterToMinter = async ({
  signer,
  muuuTokenAddress,
  minterAddress,
}: {
  signer: SignerWithAddress
  muuuTokenAddress: string
  minterAddress: string
}) => {
  console.log('> MuuuToken#addMinter (set booster as minter)')
  const tx = await MuuuToken__factory.connect(
    muuuTokenAddress,
    signer,
  ).addMinter(minterAddress)
  await tx.wait()
}

const _setImplementationToStashFactory = async ({
  signer,
  networkName,
  stashFactoryV2Address
}: {
  signer: SignerWithAddress
  networkName: string
  stashFactoryV2Address: string
}) => {
  console.log('> deploy ExtraRewardStashV3 for setting to StashFactoryV2')
  const v3Impl = await deployExtraRewardStashV3({ deployer: signer })
  TaskUtils.writeContractAddress({
    group: ContractJsonGroups.system,
    name: 'extraRewardStashV3',
    value: v3Impl.address,
    fileName: TaskUtils.getFilePath({ network: networkName }),
  })
  const _instance = StashFactoryV2__factory.connect(stashFactoryV2Address, signer)
  console.log('> StashFactoryV2#setImplementation')
  await (await _instance.setImplementation(v3Impl.address)).wait()
}

// contracts/migrations/1_deploy_contracts.js#L251-255
const _prepareAfterDeployingKglDepositor = async ({
  signer,
  addresses,
  variables
}: {
  signer: SignerWithAddress
  addresses: {
    kaglaVoterProxy: string
    booster: string
    kglToken: string
    muKglToken: string
    kglDepositor: string
  },
  variables: {
    transferingKglAmount: string
  }
}) => {
  const { kaglaVoterProxy, booster, kglToken, muKglToken, kglDepositor } = addresses
  console.log('> MuKglToken#setOperator')
  await (
    await MuKglToken__factory.connect(muKglToken, signer).setOperator(
      kglDepositor,
    )
  ).wait()
  console.log('> KaglaVoterProxy#setDepositor')
  await (
    await KaglaVoterProxy__factory.connect(
      kaglaVoterProxy,
      signer,
    ).setDepositor(kglDepositor)
  ).wait()
  console.log("> Preprocessing KglDepositor#initialLock - transfer kgl from deployer to VoterProxy")
  await (await ERC20__factory.connect(kglToken, signer).transfer(
    kaglaVoterProxy,
    variables.transferingKglAmount
  )).wait()
  console.log('> KglDepositor#initialLock')
  await(
    await KglDepositor__factory.connect(kglDepositor, signer).initialLock()
  ).wait()
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
  await (
    await Booster__factory.connect(booster, signer).setRewardContracts(
      muKglRewardPool,
      muuuRewardPool,
    )
  ).wait()
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
  await (await _boosterInstance.setPoolManager(poolManager)).wait()
  console.log('> Booster#setFactories')
  await (
    await _boosterInstance.setFactories(
      rewardFactory,
      stashFactory,
      tokenFactory,
    )
  ).wait()
  console.log('> Booster#setFeeInfo')
  await(await _boosterInstance.setFeeInfo()).wait()
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
  const tx = await Booster__factory.connect(
    addresses.booster,
    signer,
  ).setArbitrator(addresses.arbitratorVault)
  await tx.wait()
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
  const tx = await ClaimZap__factory.connect(
    claimZapAddress,
    signer,
  ).setApprovals()
  await tx.wait()
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
  await (
    await MuuuToken__factory.connect(addresses.muuuToken, signer).approve(
      addresses.vestedEscrow,
      variables.amount.toString(),
    )
  ).wait()
  const vestedEscrowInstance = await VestedEscrow__factory.connect(
    addresses.vestedEscrow,
    signer,
  )
  console.log('> VestedEscrow#addTokens')
  await (await vestedEscrowInstance.addTokens(variables.amount)).wait()
  console.log('> VestedEscrow#fund')
  await (
    await vestedEscrowInstance.fund(
      variables.vestedAddresses,
      variables.vestedAmount,
    )
  ).wait()
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
  await (
    await MerkleAirdrop__factory.connect(merkleAirdrop, signer).setRewardToken(
      muuuToken,
    )
  ).wait()

  const muuuTokenInstance = await MuuuToken__factory.connect(muuuToken, signer)
  console.log('> MuuuToken#transfer')
  await (
    await muuuTokenInstance.transfer(merkleAirdrop, variables.amount.toString())
  ).wait()
  console.log(
    `airdrop balance: ${await muuuTokenInstance.balanceOf(merkleAirdrop)}`,
  )
  console.log('> MerkleAirdrop#setRoot')
  await (
    await MerkleAirdrop__factory.connect(merkleAirdrop, signer).setRoot(
      variables.merkleRoot,
    )
  ).wait()
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

// write added pools information to json
const _writePoolInfosToJson = async ({
  signer,
  networkName,
  boosterAddress,
  kglTokenAddress,
  pools,
}: {
  signer: SignerWithAddress
  networkName: string
  boosterAddress: string
  kglTokenAddress: string
  pools?: { name: string; swap: string; gauge: string }[]
}) => {
  const poolsContracts = []
  const _boosterInstance = await Booster__factory.connect(
    boosterAddress,
    signer,
  )
  const poolLength = await _boosterInstance.poolLength()
  const list: {
    lptoken: string
    token: string
    gauge: string
    kglRewards: string
    stash: string
    shutdown: boolean
    // Processed by the user
    rewards?: any
    name?: any
    id?: number
  }[] = []
  for (let i = 0; i < poolLength.toNumber(); i++) {
    list.push(await _boosterInstance.poolInfo(i))
  }
  for (let i = 0; i < list.length; i++) {
    const kglrewards = list[i]['kglRewards']
    const rewardList = []
    rewardList.push({ rToken: kglTokenAddress, rAddress: kglrewards })
    const { lptoken, token, gauge, kglRewards, stash, shutdown } = list[i]

    const _name =
      pools?.find((p) => p.gauge.toLowerCase() === gauge.toLowerCase())?.name ??
      `mock pool ${i}`
    poolsContracts.push({
      lptoken,
      token,
      gauge,
      kglRewards,
      stash,
      shutdown,
      rewards: rewardList,
      name: _name,
      id: i,
    })
  }
  TaskUtils.writeValueToGroup(
    'pools',
    poolsContracts,
    TaskUtils.getFilePath({ network: networkName }),
  )
}

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

      const isContinue = await _validateBeforeDeployments({
        signer: signer,
        kglToken: constants.tokens.KGL,
        premine: constants.premine
      })
      if (!isContinue) return

      if (_useAlreadyDeployed) {
        console.log(`[NOTE] use already deployed contracts`)
      } else {
        // reset json to have deployed contracts' addresses
        TaskUtils.resetContractAddressesJson({ network: network.name })
      }

      const adminAddress = signer.address // TODO: from constants
      const mintAmount = BigNumber.from(constants.premine.total)

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
      console.log(`--- start: deployments & initialize / setups ---`)
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
      await _transferOwnershipAndSetOperatorInVoterProxy({
        signer,
        adminAddress,
        addresses: {
          booster: boosterAddress,
          kaglaVoterProxy: kaglaVoterProxyAddress,
        },
      })
      await _mintMuuuToken({
        signer,
        muuuTokenAddress: muuuTokenAddress,
        amount: mintAmount,
      })
      // custom operation
      await _transferPreminedMuuuToken({
        signer,
        muuuTokenAddress: muuuTokenAddress,
        premineHolders: constants.premine.holders,
        treasuryAddress: constants.contracts.treasury.address
      })
      await _addBoosterToMinter({
        signer,
        muuuTokenAddress: muuuTokenAddress,
        minterAddress: kaglaVoterProxyAddress,
      })

      const { rewardFactoryAddress, tokenFactoryAddress, stashFactoryAddress } =
        await hre.run(`deploy-FactoryContracts`, commonTaskArgs)

      // custom operation
      await _setImplementationToStashFactory({
        signer,
        networkName: network.name,
        stashFactoryV2Address: stashFactoryAddress
      })

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
          kglToken: constants.tokens.KGL,
          muKglToken: muKglTokenAddress,
          kglDepositor: kglDepositorAddress,
        },
        variables: {
          transferingKglAmount: "1"
        }
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

      const { poolManagerAddress, poolManagerProxyAddress } = await hre.run(
        `deploy-${ContractKeys.PoolManagerProxy}`,
        commonTaskArgs,
      )

      await _prepareAfterDeployingPoolManager({
        signer,
        addresses: {
          booster: boosterAddress,
          poolManager: poolManagerProxyAddress,
          rewardFactory: rewardFactoryAddress,
          tokenFactory: tokenFactoryAddress,
          stashFactory: stashFactoryAddress,
        },
      })

      // [NOTE] skip to deploy ArbitratorVault
      // const arbitratorVaultAddress = await hre.run(
      //   `deploy-${ContractKeys.ArbitratorVault}`,
      //   commonTaskArgs,
      // )
      // // contracts/migrations/1_deploy_contracts.js#L313
      // await _setArbitratorToBooster({
      //   signer,
      //   addresses: {
      //     booster: boosterAddress,
      //     arbitratorVault: arbitratorVaultAddress,
      //   },
      // })

      // [NOTE] skip to deploy ClaimZap
      // const claimZapAddress = await hre.run(
      //   `deploy-${ContractKeys.ClaimZap}`,
      //   commonTaskArgs,
      // )
      // // contracts/migrations/1_deploy_contracts.js#L341
      // await _setApprovalsInClaimZap({
      //   signer,
      //   claimZapAddress,
      // })

      // [NOTE] skip to deploy VestedEscrow
      // const vestedEscrowAddress = await hre.run(
      //   `deploy-${ContractKeys.VestedEscrow}`,
      //   commonTaskArgs,
      // )
      // // contracts/migrations/1_deploy_contracts.js#L359-369
      // await _prepareAfterDeployingVestedEscrow({
      //   signer,
      //   variables: {
      //     amount: totalVested,
      //     vestedAddresses: constants.vested.addresses,
      //     vestedAmount: constants.vested.amounts,
      //   },
      //   addresses: {
      //     muuuToken: muuuTokenAddress,
      //     vestedEscrow: vestedEscrowAddress,
      //   },
      // })

      // [NOTE] skip to deploy MerkleAirdropFactory, create MerkleAirdrop
      // const merkleAirdropFactoryAddress = await hre.run(
      //   `deploy-${ContractKeys.MerkleAirdropFactory}`,
      //   commonTaskArgs,
      // )
      // const merkleAirdropAddress = await _createMerkleAirdropFromFactory({
      //   signer,
      //   networkName: network.name,
      //   merkleAirdropFactoryAddress,
      // })
      // // contracts/migrations/1_deploy_contracts.js#L383-389
      // await _prepareAfterDeployingMerkleAirdrop({
      //   signer,
      //   variables: {
      //     amount: vekglAmount,
      //     merkleRoot: constants.contracts.merkleAirdrop.merkleRoot,
      //   },
      //   addresses: {
      //     muuuToken: muuuTokenAddress,
      //     merkleAirdrop: merkleAirdropAddress,
      //   },
      // })

      console.log(`--- finish: deployments & initialize / setups ---`)

      console.log(`--- start: add pools ---`)

      if (_useMockContracts) {
        await hre.run(`add-pool`, {
          deployerAddress: signer.address,
          poolName: '3pool',
          poolManagerAddress,
          swap: constants.tokens['3Kgl'],
          gauge: constants.kaglas.gauge,
          stashVersion: '3',
        })
      }

      if (constants.pools && constants.pools.length != 0) {
        console.log(`Scheduled to be added: count ${constants.pools.length}`)
        for (const _p of constants.pools) {
          await hre.run(`add-pool`, {
            deployerAddress: signer.address,
            poolName: _p.name,
            poolManagerAddress,
            swap: _p.swap,
            gauge: _p.gauge,
            stashVersion: '3',
          })
        }
      }

      await _writePoolInfosToJson({
        signer,
        networkName: network.name,
        boosterAddress,
        kglTokenAddress: constants.tokens.KGL,
        pools: constants.pools ?? undefined,
      })

      console.log(`--- finish: add pools ---`)

      console.log(`--- confirm: addresses/pools ---`)
      console.log(
        TaskUtils.loadDeployedContractAddresses({ network: network.name }),
      )
      console.log(`--- [all-required-developments] FINISHED ---`)
    },
  )
