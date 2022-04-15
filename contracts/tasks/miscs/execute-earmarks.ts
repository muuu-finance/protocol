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
    for (let i = 0; i < poolCount.toNumber(); i++) {
      await booster.earmarkRewards(i)
      console.log('earmark pool ' + i + ' complete')
    }
    await booster.earmarkFees()
    console.log('earmark fees complete')
    console.log(`--- FINISHED ---`)
  })
