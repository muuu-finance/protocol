import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { PoolManagerV3__factory } from '../../types'

task('force-add-pool', 'Force add pool by using PoolManager')
  .addOptionalParam('deployerAddress', "Deployer's address")
  .addParam('poolName', 'key to use pools info in json')
  .addParam('poolManagerAddress', 'PoolManager contract address')
  .addParam('gauge', 'gauge address to add')
  .addParam('lpToken', 'lpToken address to add')
  .setAction(
    async (
      {
        deployerAddress,
        poolName,
        poolManagerAddress,
        gauge,
        lpToken,
      }: {
        deployerAddress: string
        poolName: string
        poolManagerAddress: string
        gauge: string
        lpToken: string,
      },
      hre: HardhatRuntimeEnvironment,
    ) => {
      const { ethers } = hre
      const _deployer =
        (await ethers.getSigner(deployerAddress)) ||
        (await ethers.getSigners())[0]

      console.log(`--- [force-add-pool] START PoolName: ${poolName} ---`)
      const tx = await PoolManagerV3__factory.connect(poolManagerAddress, _deployer).forceAddPool(
        lpToken,
        gauge,
        3 // stash version
      )
      console.log(`tx: ${tx.hash}`)
      await tx.wait()
      console.log(`--- [force-add-pool] FINISHED ---`)
    },
  )
