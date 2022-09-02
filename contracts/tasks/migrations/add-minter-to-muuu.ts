import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { MuuuToken__factory } from '../../types'
import { TaskUtils } from '../utils'

type EthereumAddress = `0x${string}`
const PARAMS: {
  astar: EthereumAddress
  shiden: EthereumAddress
  localhost: EthereumAddress
} = {
  astar: '0xTBD',
  shiden: '0xTBD',
  localhost: '0xTBD',
}

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
      const newMinter = PARAMS[network.name as keyof typeof PARAMS]

      console.log(`--- [add-minter-to-muuu] START ---`)
      const { system } = TaskUtils.loadDeployedContractAddresses({
        network: network.name,
      })
      const muuu = MuuuToken__factory.connect(system.muuu, _executor)

      console.log(
        `[BEFORE] Booster#minterList(new minter): ${await muuu.minterList(
          newMinter,
        )}`,
      )
      console.log()

      const tx = await muuu.addMinter(newMinter)
      console.log(`tx: ${tx.hash}`)
      await tx.wait()

      console.log(
        `[AFTER] Booster#minterList(new minter): ${await muuu.minterList(
          newMinter,
        )}`,
      )
      console.log()

      console.log(`--- [add-minter-to-muuu] FINISHED ---`)
    },
  )
