import { subtask } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Booster__factory, ERC20__factory } from "../../types";
import { TaskUtils } from "../utils";

subtask("add-extra-reward:validate", "add-extra-reward:validate")
.addParam("pid", "pool id")
.addParam("token", "Token address to add as extra reward")
.setAction(async ({ pid, token }: { pid: string, token: string }, hre: HardhatRuntimeEnvironment) => {
  const { ethers, network } = hre
  const { system } = TaskUtils.loadDeployedContractAddresses({
    network: network.name,
  })
  
  console.log(`--- [add-extra-reward:validate] START ---`)

  console.log(`> About pool`)
  const boosterInstance = Booster__factory.connect(system.booster, ethers.provider)
  const pInfo = await boosterInstance.poolInfo(pid)
  console.log(pInfo)
  console.log(`lptoken name: ${await (await ERC20__factory.connect(pInfo.lptoken, ethers.provider)).name()}`)
  console.log(`deposittoken name: ${await (await ERC20__factory.connect(pInfo.token, ethers.provider)).name()}`)

  console.log(`> About token`)
  const tokenInstance = ERC20__factory.connect(token, ethers.provider)
  console.log(`name: ${await tokenInstance.name()}`)
  console.log(`symbol: ${await tokenInstance.symbol()}`)
  console.log(`decimals: ${await tokenInstance.decimals()}`)

  console.log(`--- [add-extra-reward:validate] FINISHED ---`)
})
