import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { Booster__factory } from '../../types'

task('execute-earmarks', 'Execute earmarkRewards and earmarkFees')
  .addParam('boosteraddress', 'Booster contract address')
  .setAction(async ({ boosteraddress }, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre
    const _deployer = (await ethers.getSigners())[0]

    const booster = await Booster__factory.connect(boosteraddress, _deployer)
    const poolCount = await booster.poolLength()
    const poolInfos = await Promise.all(
      [...Array(poolCount.toNumber())].map((_, i) => booster.poolInfo(i)),
    )
    for (let i = 0; i < poolCount.toNumber(); i++) {
      if (poolInfos[i].shutdown) {
        console.log(`SKIP earmark pool ${i}`)
        continue
      }
      try {
        const tx = await booster.earmarkRewards(i)
        await tx.wait()
        console.log('earmark pool ' + i + ' complete')
      } catch (e) {
        console.error(e)
      }
    }
    // [NOTE] not execute earmark fees because kagla do not distribute fee.
    // await booster.earmarkFees()
    // console.log('earmark fees complete')
    console.log(`--- FINISHED ---`)
  })
