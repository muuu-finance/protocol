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
    const poolInfos = await Promise.all([...Array(poolCount.toNumber())].map((_, i) => booster.poolInfo(i)))
    const targetPids = [...Array(poolCount.toNumber())]
      .map((_, i) => poolInfos[i].shutdown ? null : i)
      .filter((v):v is number => v !== null)
    console.log(`earmark target pool ids: ${targetPids}`)
    const txs = await Promise.all(targetPids.map(id => booster.earmarkRewards(id)))
    await Promise.all(txs.map((tx, i) => tx.wait().then(() => console.log(`earmark pool ${targetPids[i]} complete`))))

    // [NOTE] not execute earmark fees because kagla do not distribute fee.
    // await booster.earmarkFees()
    // console.log('earmark fees complete')
    console.log(`--- FINISHED ---`)
  })
