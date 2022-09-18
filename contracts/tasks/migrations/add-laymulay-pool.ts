import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

type EthereumAddress = `0x${string}`

// Parameters
const POOL_NAME = 'laymukgl'
type Param = {
  gauge: EthereumAddress | null
  lpToken: EthereumAddress | null
}
const PARAMS: {
  astar: Param
  shiden: Param
  localhost: Param
} = {
  astar: {
    gauge: '0x8af463423696cd485e138d78b261cA95EbCB7F44',
    lpToken: '0x5c71534Db6e54322943AD429209D97Fa25bBFcd2',
  },
  shiden: {
    gauge: null,
    lpToken: null,
  },
  localhost: {
    gauge: null,
    lpToken: null,
  },
}

task(`force-add-${POOL_NAME}-pool`, 'add pool to expand add-pool migration')
  .addOptionalParam('deployerAddress', "Deployer's address")
  .setAction(
    async (
      { deployerAddress }: { deployerAddress: string },
      hre: HardhatRuntimeEnvironment,
    ) => {
      console.log(`--- [force-add-${POOL_NAME}-pool] START ---`)
      const { ethers, network: _network } = hre

      const _deployer =
        (await ethers.getSigner(deployerAddress)) ||
        (await ethers.getSigners())[0]

      const networkName = _network.name as keyof typeof PARAMS
      const param = PARAMS[networkName]
      if (param.gauge == null)
        throw new Error(`[ERROR] gauge's address is null`)
      if (param.lpToken == null)
        throw new Error(`[ERROR] lpToken's address is null`)

      await hre.run(`force-add-pool-extended-version`, {
        deployerAddress: _deployer.address,
        poolName: POOL_NAME,
        gaugeAddress: param.gauge,
        lpTokenAddress: param.lpToken,
        networkName: networkName,
      })
      console.log(`--- [force-add-${POOL_NAME}-pool] FINISHED ---`)
    },
  )
