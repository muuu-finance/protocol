import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { Booster__factory } from '../../types'
import { TaskUtils } from '../utils'

const REWARD_MULTIPLIER: number = 0

task('set-reward-multiplier', 'Booster#setRewardMultiplier')
  .addOptionalParam('executor', "executor's address")
  .setAction(
    async (
      { executor }: { executor: string },
      hre: HardhatRuntimeEnvironment,
    ) => {
      const { ethers, network } = hre
      const _executor =
        (await ethers.getSigner(executor)) ||
        (await ethers.getSigners())[0]

      console.log(`--- [set-reward-multiplier] START ---`)
      const { system } = TaskUtils.loadDeployedContractAddresses({
        network: network.name
      })
      const booster = Booster__factory.connect(system.booster, _executor)

      console.log(`[BEFORE] Booster#rewardMultiplier: ${(await booster.rewardMultiplier()).toNumber()}`)
      console.log()

      const tx = await booster.setRewardMultiplier(REWARD_MULTIPLIER)
      console.log(`tx: ${tx.hash}`)
      await tx.wait()

      console.log(`[AFTER] Booster#rewardMultiplier: ${(await booster.rewardMultiplier()).toNumber()}`)
      console.log()

      console.log(`--- [set-reward-multiplier] FINISHED ---`)
    },
  )
