import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "ethers";
import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { BoosterOwner__factory, Booster__factory, KaglaVoterProxy__factory, KglDepositor__factory, MuuuLockerV2__factory, MuuuStakingProxyV2__factory, MuuuToken__factory, PoolManagerSecondaryProxy__factory, PoolManagerV3__factory, TreasuryFunds__factory } from "../../types";
import { TaskUtils } from "../utils";

// Parameters to use in task
const ADDRESSES_PARAMS = {
  operatorInTreasury: "",
  // ownerInBoosterOwner: "",
  voteDelegateInBooster: "",
  feeManagerInBooster: "",
  ownerInKagleVoterProxy: "",
  ownerInKglDepositor: "",
  feeManagerInKglDepositor: "",
  ownerInMuuuToken: "",
  ownerInMuuuLockerV2: "",
  ownerInMuuuStakingProxyV2: "",
  operatorInPoolManagerV3: "",
  ownerInPoolManagerSecondaryProxy: ""
}

// Utilities
type Addresses = {
  treasuryFunds: string
  booster: string
  boosterOwner: string
  kaglaVoterProxy: string
  kglDepositor: string
  muuuToken: string
  muuuLockerV2: string
  muuuStakingProxyV2: string
  poolManagerV3: string
  poolManagerSecondaryProxy: string
}

const _generateContracts = (provider: SignerWithAddress | ethers.providers.JsonRpcProvider, addrs: Addresses) => ({
  _treasuryFunds: TreasuryFunds__factory.connect(addrs.treasuryFunds, provider),
  _booster: Booster__factory.connect(addrs.booster, provider),
  _boosterOwner: BoosterOwner__factory.connect(addrs.boosterOwner, provider),
  _kaglaVoterProxy: KaglaVoterProxy__factory.connect(addrs.kaglaVoterProxy, provider),
  _kglDepositor: KglDepositor__factory.connect(addrs.kglDepositor, provider),
  _muuuToken: MuuuToken__factory.connect(addrs.muuuToken, provider),
  _muuuLockerV2: MuuuLockerV2__factory.connect(addrs.muuuLockerV2, provider),
  _muuuStakingProxyV2: MuuuStakingProxyV2__factory.connect(addrs.muuuStakingProxyV2, provider),
  _poolManagerV3: PoolManagerV3__factory.connect(addrs.poolManagerV3, provider),
  _poolManagerSecondaryProxy: PoolManagerSecondaryProxy__factory.connect(addrs.poolManagerSecondaryProxy, provider),
})

const getRoles = async (provider: ethers.providers.JsonRpcProvider, addrs: Addresses) => {
  const contracts = _generateContracts(provider, addrs)

  const functions = [
    { label: "Treasury’s operator", fn: contracts._treasuryFunds.operator },
    { label: "BoosterOwner's owner", fn: contracts._boosterOwner.owner },
    { label: "Booster’s voteDelegate", fn: contracts._booster.voteDelegate },
    { label: "Booster’s feeManager", fn: contracts._booster.feeManager },
    { label: "KaglaVoterProxy’s owner", fn: contracts._kaglaVoterProxy.owner },
    { label: "KglDepositor’s owner", fn: contracts._kglDepositor.owner },
    { label: "KglDepositor’s feeManager", fn: contracts._kglDepositor.feeManager },
    { label: "MuuuToken’s Owner", fn: contracts._muuuToken.owner },
    { label: "MuuuLockerV2’s owner", fn: contracts._muuuLockerV2.owner },
    { label: "MuuuStakingProxyV2’s owner", fn: contracts._muuuStakingProxyV2.owner },
    { label: "PoolManagerV3’s operator", fn: contracts._poolManagerV3.operator },
    { label: "PoolManagerSecondaryProxy’s owner", fn: contracts._poolManagerSecondaryProxy.owner },
  ]
  for (const _v of functions) console.log(`${_v.label} ... ${await _v.fn()}`)
}

const validateInputtedAddress = (params: typeof ADDRESSES_PARAMS): boolean => {
  for (const [key, value] of Object.entries(params)) {
    if (!ethers.utils.isAddress(value)) {
      console.log(`[ERROR] input is not address: ${key}`)
      return false
    }
  }
  return true
}

const bulkTransferRoleToInputtedAddress = async (signer: SignerWithAddress, addrs: Addresses, params: typeof ADDRESSES_PARAMS) => {
  const {
    _treasuryFunds,
    _booster,
    // _boosterOwner,
    _kaglaVoterProxy,
    _kglDepositor,
    _muuuToken,
    _muuuLockerV2,
    _muuuStakingProxyV2,
    _poolManagerV3,
    _poolManagerSecondaryProxy,
  } = _generateContracts(signer, addrs)

  await (await _treasuryFunds.setOperator(params.operatorInTreasury)).wait()
  await (await _booster.setVoteDelegate(params.voteDelegateInBooster)).wait()
  await (await _booster.setFeeManager(params.feeManagerInBooster)).wait()
  await (await _kaglaVoterProxy.transferOwnership(params.ownerInKagleVoterProxy)).wait()
  await (await _kglDepositor.setFeeManager(params.feeManagerInKglDepositor)).wait()
  await (await _kglDepositor.transferOwnership(params.ownerInKglDepositor)).wait()
  await (await _muuuToken.transferOwnership(params.ownerInMuuuToken)).wait()
  await (await _muuuLockerV2.transferOwnership(params.ownerInMuuuLockerV2)).wait()
  
  // transfer MuuuStakingProxyV2's owner
  await (await _muuuStakingProxyV2.setPendingOwner(params.ownerInMuuuStakingProxyV2)).wait()
  await (await _muuuStakingProxyV2.applyPendingOwner()).wait()

  await (await _poolManagerV3.setOperator(params.operatorInPoolManagerV3)).wait()
  await (await _poolManagerSecondaryProxy.setOwner(params.ownerInPoolManagerSecondaryProxy)).wait()

  // About BoosterOwner
  // BoosterOwner#transferOwnership from old admin
  // BoosterOwner#acceptOwnership from new admin
}

// Main
task(
  'transfer-roles',
  "Transfer contract roles (owner, operator etc)"
).setAction(async ({}, hre: HardhatRuntimeEnvironment) => {
  console.log(`--- [transfer-roles] START ---`)
  const { network, ethers } = hre
  console.log(`network: ${network.name}`)
  const [signer] = await ethers.getSigners()
  console.log(`deployer: ${await signer.getAddress()}`)

  const { system } = TaskUtils.loadDeployedContractAddresses({
    network: network.name,
  })

  const addresses: Addresses = {
    treasuryFunds: system.treasury,
    booster: system.booster,
    boosterOwner: system.boosterOwner,
    kaglaVoterProxy: system.voteProxy,
    kglDepositor: system.kglDepositor,
    muuuToken: system.muuu,
    muuuLockerV2: system.muuuLockerV2,
    muuuStakingProxyV2: system.muuuStakingProxyV2,
    poolManagerV3: system.poolManagerV3,
    poolManagerSecondaryProxy: system.poolManagerSecondaryProxy,
  }

  console.log(`> check role before transfering ---`)
  await getRoles(ethers.provider, addresses)

  console.log(`--- transfer roles: start ---`)
  if (!validateInputtedAddress(ADDRESSES_PARAMS)) return
  await bulkTransferRoleToInputtedAddress(signer, addresses, ADDRESSES_PARAMS)
  console.log(`--- transfer roles: end ---`)

  console.log(`> check role after transfering ---`)
  await getRoles(ethers.provider, addresses)

  console.log(`--- [transfer-roles] FINISHED ---`)
})
