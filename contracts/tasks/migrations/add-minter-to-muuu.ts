import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { MuuuToken__factory } from '../../types'
import { TaskUtils } from '../utils'

const NEW_MINTER: string = ''

task('add-minter-to-muuu', 'MuuuToken#addMinter')
  .addOptionalParam('executor', "executor's address")
  .setAction(
    async (
      { executor }: { executor: string },
      hre: HardhatRuntimeEnvironment,
    ) => {
      const { ethers, network } = hre
      const _executor =
        (await ethers.getSigner(executor)) || (await ethers.getSigners())[0]

      console.log(`--- [add-minter-to-muuu] START ---`)
      const { system } = TaskUtils.loadDeployedContractAddresses({
        network: network.name,
      })
      const muuu = MuuuToken__factory.connect(system.muuu, _executor)

      console.log(
        `[BEFORE] Booster#minterList(new minter): ${await muuu.minterList(
          NEW_MINTER,
        )}`,
      )
      console.log()

      const tx = await muuu.addMinter(NEW_MINTER)
      console.log(`tx: ${tx.hash}`)
      await tx.wait()

      console.log(
        `[AFTER] Booster#minterList(new minter): ${await muuu.minterList(
          NEW_MINTER,
        )}`,
      )
      console.log()

      console.log(`--- [add-minter-to-muuu] FINISHED ---`)
    },
  )
