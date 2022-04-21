import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { MuKglToken__factory, MuuuToken__factory } from '../../types'

task('deploy-contracts', 'Deploy contracts').setAction(
  async ({}, hre: HardhatRuntimeEnvironment) => {
    const { network, ethers } = hre
    console.log(`network: ${network.name}`)
    const [signer] = await ethers.getSigners()
    console.log(`deployer: ${await signer.getAddress()}`)

    const muuuToken = await new MuuuToken__factory(signer).deploy()
    await muuuToken.deployTransaction.wait()
    console.log(`MuuuToken deployed to: ${muuuToken.address}`)

    const muKglToken = await new MuKglToken__factory(signer).deploy()
    await muuuToken.deployTransaction.wait()
    console.log(`MuKglToken deployed to: ${muKglToken.address}`)

    // const muuuLockerV2 = await new MuuuLockerV2__factory(signer).deploy();
    // await muuuLockerV2.deployTransaction.wait()
    // console.log(`MuuuLockerV2 deployed to: ${muuuLockerV2.address}`);
  },
)
