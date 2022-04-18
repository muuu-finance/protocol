import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { MuuuLockerV2__factory, MuuuStakingProxyV2__factory } from '../../types'
import { ContractKeys, TaskUtils } from '../utils'

task('locker-deployments', 'Deploy necessary contracts to lock, vote function')
  .addFlag(
    'useMockContracts',
    'Use mock contracts, get addresses from json to mock contract addresses',
  )
  .setAction(
    async (
      { useMockContracts: _useMockContracts }: { useMockContracts: boolean },
      hre: HardhatRuntimeEnvironment,
    ) => {
      console.log(`--- [locker-deployments] START ---`)
      const { network, ethers } = hre
      console.log(`network: ${network.name}`)
      const [signer] = await ethers.getSigners()
      console.log(`deployer: ${await signer.getAddress()}`)
      console.log(`useMockContracts flag: ${_useMockContracts}`)

      const deployeds = TaskUtils.loadDeployedContractAddresses({
        network: network.name,
      })

      const commonTaskArgs = {
        deployerAddress: signer.address,
        inMultiDeploymentFlow: true,
        useAlreadyDeployed: false,
        useMockContracts: _useMockContracts,
      }

      console.log(`--- start: deployments ---`)
      const lockerAddress = await hre.run(
        `deploy-${ContractKeys.MuuuLockerV2}`,
        commonTaskArgs,
      )
      const stakingProxyAddress = await hre.run(
        `deploy-${ContractKeys.MuuuStakingProxyV2}`,
        commonTaskArgs,
      )
      await hre.run(
        `deploy-${ContractKeys.VotingBalanceV2Gauges}`,
        commonTaskArgs,
      )
      console.log(`--- finish: deployments ---`)

      console.log(`--- start: initialize / setups ---`)
      const lockerInstance = MuuuLockerV2__factory.connect(
        lockerAddress,
        signer,
      )
      const stakingProxyInstance = MuuuStakingProxyV2__factory.connect(
        stakingProxyAddress,
        signer,
      )
      console.log(`> MuuuStakingProxyV2#setApprovals`)
      await (await stakingProxyInstance.setApprovals()).wait()
      console.log(`> MuuuLockerV2#addReward`)
      await (
        await lockerInstance.addReward(
          deployeds.system.muKgl,
          stakingProxyAddress,
          true,
        )
      ).wait()
      console.log(`> MuuuLockerV2#setStakingContract`)
      await (
        await lockerInstance.setStakingContract(stakingProxyAddress)
      ).wait()
      console.log(`> MuuuLockerV2#setApprovals`)
      await (await lockerInstance.setApprovals()).wait()
      console.log(`> [skip] MuuuLockerV2#transferOwnership`)
      // await (await lockerInstance.transferOwnership(multisig)).wait()
      console.log(`Locker's owner: ${await lockerInstance.owner()}`)

      console.log(`--- finish: initialize / setups ---`)

      console.log(
        TaskUtils.loadDeployedContractAddresses({ network: network.name }),
      )
      console.log(`--- [locker-deployments] FINISHED ---`)
    },
  )
