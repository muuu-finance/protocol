import { ethers } from "ethers";
import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { BoosterOwner__factory, Booster__factory, KaglaVoterProxy__factory, KglDepositor__factory, MuuuLockerV2__factory, MuuuStakingProxyV2__factory, MuuuToken__factory, PoolManagerSecondaryProxy__factory, PoolManagerV3__factory, TreasuryFunds__factory } from "../../types";
import { TaskUtils } from "../utils";


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

const getRoles = async (provider: ethers.providers.JsonRpcProvider, addrs: Addresses) => {
  const _treasuryFunds = TreasuryFunds__factory.connect(addrs.treasuryFunds, provider)
  const _booster = Booster__factory.connect(addrs.booster, provider)
  const _boosterOwner = BoosterOwner__factory.connect(addrs.boosterOwner, provider)
  const _kaglaVoterProxy = KaglaVoterProxy__factory.connect(addrs.kaglaVoterProxy, provider)
  const _kglDepositor = KglDepositor__factory.connect(addrs.kglDepositor, provider)
  const _muuuToken = MuuuToken__factory.connect(addrs.muuuToken, provider)
  const _muuuLockerV2 = MuuuLockerV2__factory.connect(addrs.muuuLockerV2, provider)
  const _muuuStakingProxyV2 = MuuuStakingProxyV2__factory.connect(addrs.muuuStakingProxyV2, provider)
  const _poolManagerV3 = PoolManagerV3__factory.connect(addrs.poolManagerV3, provider)
  const _poolManagerSecondaryProxy = PoolManagerSecondaryProxy__factory.connect(addrs.poolManagerSecondaryProxy, provider)

  const functions = [
    { label: "Treasury’s operator", fn: _treasuryFunds.operator },
    { label: "BoosterOwner's owner", fn: _boosterOwner.owner },
    { label: "Booster’s voteDelegate", fn: _booster.voteDelegate },
    { label: "Booster’s feeManager", fn: _booster.feeManager },
    { label: "KaglaVoterProxy’s owner", fn: _kaglaVoterProxy.owner },
    { label: "KglDepositor’s owner", fn: _kglDepositor.owner },
    { label: "KglDepositor’s feeManager", fn: _kglDepositor.feeManager },
    { label: "MuuuToken’s Owner", fn: _muuuToken.owner },
    { label: "MuuuLockerV2’s owner", fn: _muuuLockerV2.owner },
    { label: "MuuuStakingProxyV2’s owner", fn: _muuuStakingProxyV2.owner },
    { label: "PoolManagerV3’s operator", fn: _poolManagerV3.operator },
    { label: "PoolManagerSecondaryProxy’s owner", fn: _poolManagerSecondaryProxy.owner },
  ]
  for (const _v of functions) console.log(`${_v.label} ... ${await _v.fn()}`)
}

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
  // TODO
  console.log(`--- transfer roles: end ---`)

  console.log(`> check role after transfering ---`)
  await getRoles(ethers.provider, addresses)

  console.log(`--- [transfer-roles] FINISHED ---`)
})