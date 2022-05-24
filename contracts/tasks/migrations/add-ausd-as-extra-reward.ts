import { task } from "hardhat/config"
import { HardhatRuntimeEnvironment } from "hardhat/types"

type EthereumAddress = `0x${string}`

// Parameters
interface Parameter {
  pid: number,
  token: EthereumAddress
}
const TOKEN_NAME = "ausd"
const PARAMETER: { astar: Parameter, shiden: Parameter, localhost: Parameter } = {
  // astar: {
  //   pid: 8, // ausd3kgl
  //   token: "0xTBD",
  // },
  astar: { // temp
    pid: 0,
    token: "0x257f1a047948f73158DaDd03eB84b34498bCDc60",
  },
  shiden: {
    pid: 3, // temp
    token: "0xTBD",
  },
  localhost: {
    pid: 3, // temp
    token: "0xTBD",
  },
}

task(
  `add-${TOKEN_NAME}-as-extra-reward`,
  `add-${TOKEN_NAME}-as-extra-reward`
)
.addOptionalParam('deployerAddress', "Deployer's address")
.setAction(async ({ deployerAddress }: { deployerAddress: string }, hre: HardhatRuntimeEnvironment) => {
  console.log(`--- [add-${TOKEN_NAME}-as-extra-reward] START ---`)
  const networkName = hre.network.name as keyof typeof PARAMETER
  const { pid, token } = PARAMETER[networkName]

  await hre.run("add-extra-reward:validate", { pid: pid.toString(), token });
  await hre.run("add-extra-reward:execute", { pid: pid.toString(), token, deployerAddress });

  console.log(`--- [add-${TOKEN_NAME}-as-extra-reward] FINISHED ---`)
})
