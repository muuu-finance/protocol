import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "ethers";
import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Booster__factory, ERC20__factory, MuuuToken__factory } from "../../types";
import { TaskUtils } from "../utils";

type CheckFunctionArgs = {
  address: string,
  providerOrSigner: SignerWithAddress | ethers.providers.JsonRpcProvider,
}

const checkERC20Token = async (args: CheckFunctionArgs & { name: string }) => {
  console.log(`--- [start] ${args.name} ---`)
  console.log(`> address ... ${args.address}`)
  const _instance = await ERC20__factory.connect(args.address, args.providerOrSigner)
  const targets = [
    { label: "name", fn: _instance.name },
    { label: "symbol", fn: _instance.symbol },
    { label: "decimals", fn: _instance.decimals },
  ]
  for (const _v of targets) console.log(`${_v.label} ... ${await _v.fn()}`)
  console.log(`--- [end] ${args.name} ---`)
}

const checkMuuuToken = async (args: CheckFunctionArgs) => {
  console.log(`--- [start] MuuuToken ---`)
  console.log(`> address ... ${args.address}`)
  const _instance = await MuuuToken__factory.connect(args.address, args.providerOrSigner)
  const targets = [
    { label: "name", fn: _instance.name },
    { label: "symbol", fn: _instance.symbol },
    { label: "decimals", fn: _instance.decimals },
    { label: "totalSupply", fn: _instance.totalSupply },
    { label: "operator", fn: _instance.operator },
    { label: "vekglProxy", fn: _instance.vekglProxy },
    { label: "maxSupply", fn: _instance.maxSupply },
    { label: "totalCliffs", fn: _instance.totalCliffs },
    { label: "reductionPerCliff", fn: _instance.reductionPerCliff },
  ]
  for (const _v of targets) console.log(`${_v.label} ... ${await _v.fn()}`)
  console.log(`--- [end] MuuuToken ---`)
}

const checkBooster = async (args: CheckFunctionArgs) => {
  console.log(`--- [start] Booster ---`)
  console.log(`> address ... ${args.address}`)
  const _instance = await Booster__factory.connect(args.address, args.providerOrSigner)
  const targets = [
    { label: "kgl", fn: _instance.kgl },
    { label: "voteOwnership", fn: _instance.voteOwnership },
    { label: "voteParameter", fn: _instance.voteParameter },
    { label: "lockIncentive", fn: _instance.lockIncentive },
    { label: "stakerIncentive", fn: _instance.stakerIncentive },
    { label: "earmarkIncentive", fn: _instance.earmarkIncentive },
    { label: "feeManager", fn: _instance.feeManager },
    { label: "poolManager", fn: _instance.poolManager },
    { label: "staker", fn: _instance.staker },
    { label: "minter", fn: _instance.minter },
    { label: "rewardFactory", fn: _instance.rewardFactory },
    { label: "stashFactory", fn: _instance.stashFactory },
    { label: "tokenFactory", fn: _instance.tokenFactory },
    { label: "voteDelegate", fn: _instance.voteDelegate },
    { label: "treasury", fn: _instance.treasury },
    { label: "stakerRewards", fn: _instance.stakerRewards },
    { label: "lockRewards", fn: _instance.lockRewards },
    { label: "lockFees", fn: _instance.lockFees },
    { label: "feeDistro", fn: _instance.feeDistro },
    { label: "feeToken", fn: _instance.feeToken },
    { label: "registry", fn: _instance.registry },
    { label: "isShutdown", fn: _instance.isShutdown },
  ]
  for (const _v of targets) console.log(`${_v.label} ... ${await _v.fn()}`)
  const _poolLength = await _instance.poolLength()
  console.log(`poolLength ... ${_poolLength.toNumber()}`)
  for (let i = 0; i < _poolLength.toNumber(); i++) {
    console.log(`> poolInfo(${i})`)
    console.log(await _instance.poolInfo(i))
  }
  console.log(`--- [end] Booster ---`)
}

task('check-deployed-contracts', 'Check deployed contracts').setAction(
  async ({}, hre: HardhatRuntimeEnvironment) => {
    const { network, ethers } = hre
    if (!(network.name === "astar" || network.name === "shiden")) throw new Error("Support only astar, shiden...")
    console.log(`------- START -------`)
    console.log(`network ... ${network.name}`)

    const { system } = TaskUtils.loadDeployedContractAddresses({
      network: network.name,
    })

    await checkMuuuToken({
      address: system.muuu,
      providerOrSigner: ethers.provider
    })

    await checkBooster({
      address: system.booster,
      providerOrSigner: ethers.provider
    })

    console.log(`------- END -------`)
  }
)