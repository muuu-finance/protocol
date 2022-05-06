import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import {
  BaseRewardPool__factory,
  ClaimZap__factory,
  ERC20__factory,
  MuuuLockerV2__factory,
} from '../../types'
import { loadConstants } from '../constants'
import { TaskUtils } from '../utils'

task('test-claimzap', 'test claim zap').setAction(
  async ({}, hre: HardhatRuntimeEnvironment) => {
    const { network, ethers } = hre
    if (!(network.name === 'shiden')) throw new Error('Support only shiden')
    console.log(`------- START -------`)
    console.log(`network ... ${network.name}`)
    const { system } = TaskUtils.loadDeployedContractAddresses({
      network: network.name,
    })
    const constants = loadConstants({
      network: network.name,
      isUseMocks: false,
    })
    const deployer = (await ethers.getSigners())[0]

    const claimZap = await ClaimZap__factory.connect(system.claimZap, deployer)
    const name = await claimZap.getName()
    console.log('getName()', name)

    console.log(`--- Before Claim ---`)
    const kgl = await ERC20__factory.connect(constants.tokens.KGL, deployer)
    const kglBalance = await kgl.balanceOf(deployer.address)
    console.log('I have KGL:', kglBalance.toString())
    const muuu = await ERC20__factory.connect(system.muuu, deployer)
    const muuuBalance = await muuu.balanceOf(deployer.address)
    console.log('I have MUUU:', muuuBalance.toString())
    const muKgl = await ERC20__factory.connect(system.muKgl, deployer)
    const muKglBalance = await muKgl.balanceOf(deployer.address)
    console.log('I have muKGL:', muKglBalance.toString())
    const muKGLRewards = await BaseRewardPool__factory.connect(
      system.muKglRewards,
      deployer,
    )
    const stakedMuKgl = await muKGLRewards.balanceOf(deployer.address)
    const earnedInMukglRewards = await muKGLRewards.earned(deployer.address)
    console.log('I have staked muKGL:', stakedMuKgl.toString())
    console.log(
      'I have earned in muKGL rewards:',
      earnedInMukglRewards.toString(),
    )
    const muuuRewards = await BaseRewardPool__factory.connect(
      system.muuuRewards,
      deployer,
    )
    const stakedMuuu = await muuuRewards.balanceOf(deployer.address)
    const earnedInMuuuRewards = await muuuRewards.earned(deployer.address)
    console.log('I have staked MUUU:', stakedMuuu.toString())
    console.log(
      'I have earned in muuu rewards:',
      earnedInMuuuRewards.toString(),
    )
    const locker = await MuuuLockerV2__factory.connect(
      system.muuuLockerV2,
      deployer,
    )
    const locked = await locker.lockedBalances(deployer.address)
    const earnedInLocker = await locker.claimableRewards(deployer.address)
    console.log('I have locked MUUU:', locked.toString())
    console.log('I have earned in locker:', earnedInLocker.toString())

    console.log(`--- Claim ---`)
    // const kglAllowance = await kgl.allowance(deployer.address, claimZap.address)
    // console.log('kglAllowance:', kglAllowance.toString())
    // const muuuAllowance = await kgl.allowance(
    //   deployer.address,
    //   claimZap.address,
    // )
    // console.log('muuuAllowance:', muuuAllowance.toString())
    // const muKglAllowance = await muKgl.allowance(
    //   deployer.address,
    //   claimZap.address,
    // )
    // console.log('muKglAllowance:', muKglAllowance.toString())
    const tx1 = await kgl.approve(claimZap.address, ethers.constants.MaxUint256)
    await tx1.wait()
    const tx2 = await muuu.approve(
      claimZap.address,
      ethers.constants.MaxUint256,
    )
    await tx2.wait()
    const tx3 = await muKgl.approve(
      claimZap.address,
      ethers.constants.MaxUint256,
    )
    await tx3.wait()
    // set values
    const tx = await claimZap.claimRewards([], false, false, false, false)
    await tx.wait()

    console.log(`--- After Claim ---`)
    const kglBalanceAfter = await kgl.balanceOf(deployer.address)
    console.log('I have KGL:', kglBalanceAfter.toString())
    const muuuBalanceAfter = await muuu.balanceOf(deployer.address)
    console.log('I have MUUU:', muuuBalanceAfter.toString())
    const muKglBalanceAfter = await muKgl.balanceOf(deployer.address)
    console.log('I have muKGL:', muKglBalanceAfter.toString())
    const stakedMuKglAfter = await muKGLRewards.balanceOf(deployer.address)
    console.log('I have staked muKGL:', stakedMuKglAfter.toString())
    const earnedInMuKglRewardsAfter = await muKGLRewards.earned(
      deployer.address,
    )
    console.log(
      'I have earned in muKGL rewards:',
      earnedInMuKglRewardsAfter.toString(),
    )
    const stakedMuuuAfter = await muuuRewards.balanceOf(deployer.address)
    console.log('I have staked MUUU:', stakedMuuuAfter.toString())
    const earnedInMuuuRewardsAfter = await muuuRewards.earned(deployer.address)
    console.log(
      'I have earned in muuu rewards:',
      earnedInMuuuRewardsAfter.toString(),
    )
    const lockedAfter = await locker.lockedBalances(deployer.address)
    const earnedInLockerAfter = await locker.claimableRewards(deployer.address)
    console.log('I have locked MUUU:', lockedAfter.toString())
    console.log('I have earned in locker:', earnedInLockerAfter.toString())

    console.log(`--- FINISHED ---`)
  },
)
