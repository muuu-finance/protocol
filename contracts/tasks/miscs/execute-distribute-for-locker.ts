import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { MuuuLockerV2__factory, MuuuStakingProxyV2__factory } from '../../types'

task('execute-distribute-for-locker', 'Execute StakingProxy#distribute')
  .addParam('stakingproxyAddress', 'StakingProxy contract address')
  .addOptionalParam('lockerAddress', 'Locker contract address')
  .addOptionalParam('mukglAddress', 'StakingProxy contract address')
  .setAction(async ({ stakingproxyAddress, lockerAddress, mukglAddress }, hre: HardhatRuntimeEnvironment) => {
    console.log(`--- START execute-distribute-for-locker ---`)
    const { ethers } = hre
    const _deployer = (await ethers.getSigners())[0]

    if (lockerAddress && mukglAddress) {
      console.log(`> [Before] Check reward status (Locker#rewardData(muKgl))`)
      console.log(await MuuuLockerV2__factory.connect(lockerAddress, ethers.provider).rewardData(mukglAddress))
    }

    console.log(`> Start StakingProxy#distribute`)
    const tx = await MuuuStakingProxyV2__factory.connect(stakingproxyAddress, _deployer).distribute()
    const receipt = await tx.wait()
    console.log(`> Finished StakingProxy#distribute, gas: ${receipt.gasUsed}`)

    if (lockerAddress && mukglAddress) {
      console.log(`> [After] Check reward status (Locker#rewardData(muKgl))`)
      console.log(await MuuuLockerV2__factory.connect(lockerAddress, ethers.provider).rewardData(mukglAddress))
    }
    console.log(`--- FINISHED execute-distribute-for-locker ---`)
  })
