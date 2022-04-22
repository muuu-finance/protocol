import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { PoolManagerV3__factory, PoolManager__factory } from '../../types'

task('add-pool', 'Add pool by using PoolManager')
  .addOptionalParam('deployerAddress', "Deployer's address")
  .addParam('poolName', 'key to use pools info in json')
  .addParam('poolManagerAddress', 'PoolManager contract address')
  .addParam('swap', 'param in PoolManager#swap')
  .addParam('gauge', 'param in PoolManager#swap')
  .addParam('stashVersion', 'param in PoolManager#swap')
  .setAction(
    async (
      {
        deployerAddress,
        poolName,
        poolManagerAddress,
        swap,
        gauge,
        stashVersion,
      }: {
        deployerAddress: string
        poolName: string
        poolManagerAddress: string
        swap: string
        gauge: string
        stashVersion: string
      },
      hre: HardhatRuntimeEnvironment,
    ) => {
      const { ethers } = hre
      const _deployer =
        (await ethers.getSigner(deployerAddress)) ||
        (await ethers.getSigners())[0]

      console.log(`--- [add-pool] START PoolName: ${poolName} ---`)
      const tx = await PoolManagerV3__factory.connect(poolManagerAddress, _deployer)
        .functions["addPool(address)"](gauge)
      await tx.wait()
      console.log(`--- [add-pool] FINISHED ---`)
    },
  )
