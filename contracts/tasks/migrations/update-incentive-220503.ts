import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "ethers";
import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Booster__factory } from "../../types";
import { TaskUtils } from "../utils";

const SUPPORTED_NETWORK = ["astar", "shiden", "localhost"] as const
type SupportedNetwork = typeof SUPPORTED_NETWORK[number]

task(
  "update-incentive-220503",
  "update-incentive-220503"
).addOptionalParam(
  'deployerAddress',
  "Deployer's address"
).setAction(async ({ deployerAddress }: { deployerAddress: string }, hre: HardhatRuntimeEnvironment) => {
  const { ethers, network: _network } = hre
  if (!(SUPPORTED_NETWORK as ReadonlyArray<string>).includes(_network.name)) throw new Error(`Support only ${SUPPORTED_NETWORK} ...`)
  const networkName = _network.name as SupportedNetwork
  const { system } = TaskUtils.loadDeployedContractAddresses({ network: networkName })
  const _deployer =
    (await ethers.getSigner(deployerAddress)) ||
    (await ethers.getSigners())[0]
  console.log(`--- [update-incentive-220503] START ---`)
  console.log(`network name ... ${networkName}`)
  console.log(`deployer ... ${_deployer.address}`)

  console.log(`--- BEFORE check ---`)
  await confirmIncentives(system.booster, _deployer)

  console.log(`--- AFTER check ---`)
  await confirmIncentives(system.booster, _deployer)
  console.log(`--- [update-incentive-220503] FINISHED ---`)
})

const confirmIncentives = async (
  address: string,
  providerOrSigner: SignerWithAddress | ethers.providers.JsonRpcProvider
) => {
  const _instance = await Booster__factory.connect(
    address,
    providerOrSigner,
  )
  const targets = [
    { label: 'lockIncentive', fn: _instance.lockIncentive },
    { label: 'stakerIncentive', fn: _instance.stakerIncentive },
    { label: 'earmarkIncentive', fn: _instance.earmarkIncentive },
    { label: 'nativeTokenLockIncentive', fn: _instance.nativeTokenLockIncentive },
  ]
  for (const _v of targets) console.log(`${_v.label} ... ${await _v.fn()}`) 
}

task(
  "confirm-incentive-220503",
  'confirm-incentive-220503'
).setAction(async ({}, hre: HardhatRuntimeEnvironment) => {
  const { ethers, network } = hre
  const { system } = TaskUtils.loadDeployedContractAddresses({ network: network.name })
  const _deployer = (await ethers.getSigners())[0]

  await confirmIncentives(system.booster, _deployer)
})