import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import {
  deployMuKglToken,
  deployMuuuLockerV2,
  deployMuuuToken,
  deployVotingBalanceV2Gauges,
} from '../../helpers/contracts-deploy-helpers'
import {
  MuKglToken__factory,
  MuuuLockerV2__factory,
  MuuuToken__factory,
  VotingBalanceV2Gauges__factory,
} from '../../types'

task('deploy-only-lockers-for-test', 'deploy-only-lockers-for-test').setAction(
  async ({}, hre: HardhatRuntimeEnvironment) => {
    console.log(`--- [deploy-only-lockers-for-test] START ---`)
    const { network, ethers } = hre
    console.log(`network: ${network.name}`)
    const [signer] = await ethers.getSigners()
    console.log(`deployer: ${signer.address}`)

    const muuuToken = await deployMuuuToken({
      deployer: signer,
    })
    const muuuLockerV2 = await deployMuuuLockerV2({
      deployer: signer,
      stakingToken: muuuToken.address,
      muKgl: ethers.constants.AddressZero,
      boostPayment: ethers.constants.AddressZero,
      mukglStaking: ethers.constants.AddressZero,
    })
    const votingBalanceV2Gauges = await deployVotingBalanceV2Gauges({
      deployer: signer,
      locker: muuuLockerV2.address,
    })

    const tx = await muuuToken.mint(
      signer.address,
      ethers.utils.parseUnits((50 * 1000000).toString()),
    )
    await tx.wait()

    console.log({
      muuuToken: muuuToken.address,
      muuuLockerV2: muuuLockerV2.address,
      votingBalanceV2Gauges: votingBalanceV2Gauges.address,
    })

    console.log(`--- [deploy-only-lockers-for-test] FINISHED ---`)
  },
)

task('deploy-mukgl-for-test', 'deploy-mukgl-for-test').setAction(
  async ({}, hre: HardhatRuntimeEnvironment) => {
    console.log(`--- [deploy-mukgl-for-test] START ---`)
    const { network, ethers } = hre
    console.log(`network: ${network.name}`)
    const [signer] = await ethers.getSigners()
    console.log(`deployer: ${signer.address}`)

    const muKglToken = await deployMuKglToken({
      deployer: signer,
    })
    console.log({
      muKglToken: muKglToken.address,
    })

    console.log(`--- [deploy-mukgl-for-test] FINISHED ---`)
  },
)

task('mint-mukgl-for-test', 'mint-mukgl-for-test').setAction(
  async ({}, hre: HardhatRuntimeEnvironment) => {
    const { network, ethers } = hre
    console.log(`network: ${network.name}`)
    const [signer] = await ethers.getSigners()
    console.log(`deployer: ${signer.address}`)

    const muKgl = MuKglToken__factory.connect(
      '0x07e612C79265eC80c5609193058838532e301a63',
      signer,
    )
    await await muKgl.mint(signer.address, ethers.utils.parseUnits('5000'))
  },
)

// const PARAMS = {
//   muuuToken: '0xD355A07839b65B857F1007892f78cF58712fDd98',
//   muuuLockerV2: '0x9114ffc07420f6c1c83F92CF58DaD2f285a44a0A',
//   votingBalanceV2Gauges: '0xe7b41728A1f7E1D8a9fA53F7edBeF3A1aBc7a67e'
// }

const PARAMS = {
  muuuToken: '0x0078371BDeDE8aAc7DeBfFf451B74c5EDB385Af7',
  muuuLockerV2: '0xf4e77E5Da47AC3125140c470c71cBca77B5c638c',
  votingBalanceV2Gauges: '0xf784709d2317D872237C4bC22f867d1BAe2913AB',
}

task(
  'lockers-for-test:increase-time',
  'lockers-for-test:increase-time',
).setAction(async ({}, hre: HardhatRuntimeEnvironment) => {
  const { network, ethers } = hre
  console.log(`network: ${network.name}`)
  await ethers.provider.send('evm_increaseTime', [60 * 15])
  await ethers.provider.send('evm_mine', [])
  console.log(`--- CurrentTime ---`)
  const currentBlockNumber = await ethers.provider.getBlockNumber()
  console.log(currentBlockNumber)
  const block = await ethers.provider.getBlock(currentBlockNumber)
  console.log(new Date(block.timestamp * 1000))
})

task(
  'lockers-for-test:current-lockerV2',
  'lockers-for-test:current-lockerV2',
).setAction(async ({}, hre: HardhatRuntimeEnvironment) => {
  const { network, ethers } = hre
  console.log(`network: ${network.name}`)
  const [signer] = await ethers.getSigners()

  console.log(`--- CurrentTime ---`)
  const currentBlockNumber = await ethers.provider.getBlockNumber()
  console.log(`currentBlockNumber ... ${currentBlockNumber}`)
  const block = await ethers.provider.getBlock(currentBlockNumber)
  console.log(new Date(block.timestamp * 1000))
  console.log(`--- MuuuLockerV2 ---`)
  const _locker = MuuuLockerV2__factory.connect(
    PARAMS.muuuLockerV2,
    ethers.provider,
  )
  console.log(
    `totalSupply ... ${ethers.utils.formatUnits(await _locker.totalSupply())}`,
  )
  const epochCount = (await _locker.epochCount()).toNumber()
  for (let i = 0; i < epochCount; i++) {
    console.log(`> epochs ${epochCount - i - 1}`)
    const epoch = await _locker.epochs(epochCount - i - 1)
    // console.log(epoch)
    console.log('- supply')
    console.log(ethers.utils.formatUnits(epoch.supply))
    console.log('- date')
    console.log(new Date(epoch.date * 1000))
  }
})

task(
  'lockers-for-test:confirm-balance-of-muuu',
  'lockers-for-test:confirm-balance-of-muuu',
).setAction(async ({}, hre: HardhatRuntimeEnvironment) => {
  const { network, ethers } = hre
  console.log(`network: ${network.name}`)
  const accounts = await hre.ethers.getSigners()
  const muuu = MuuuToken__factory.connect(PARAMS.muuuToken, ethers.provider)
  const locker = MuuuLockerV2__factory.connect(
    PARAMS.muuuLockerV2,
    ethers.provider,
  )

  console.log(
    `MUUU maxSupply ... ${hre.ethers.utils.formatUnits(
      await muuu.maxSupply(),
    )}`,
  )
  console.log(
    `MUUU totalSupply ... ${hre.ethers.utils.formatUnits(
      await muuu.totalSupply(),
    )}`,
  )
  for (const account of accounts) {
    console.log(`------------------------------------------`)
    console.log(`account ... ${await account.address}`)
    // console.log(`balance ... ${hre.ethers.utils.formatUnits(await account.getBalance())}`)
    console.log(
      `MUUU balance ... ${hre.ethers.utils.formatUnits(
        await muuu.balanceOf(account.address),
      )}`,
    )
    console.log(
      `vlMUUU balance ... ${hre.ethers.utils.formatUnits(
        await locker.balanceOf(account.address),
      )}`,
    )
  }
})

task('lockers-for-test:lock-muuu', 'lockers-for-test:lock-muuu')
  .addOptionalParam('deployerAddress', 'deployerAddress')
  .addOptionalParam('amount', 'minting muuu amount')
  .setAction(
    async ({ deployerAddress, amount }, hre: HardhatRuntimeEnvironment) => {
      const { network, ethers } = hre
      console.log(`network: ${network.name}`)
      const signer = deployerAddress
        ? await ethers.getSigner(deployerAddress)
        : (await ethers.getSigners())[0]
      const _amount = amount ? amount : '1'

      const muuu = MuuuToken__factory.connect(PARAMS.muuuToken, signer)
      const locker = MuuuLockerV2__factory.connect(PARAMS.muuuLockerV2, signer)
      let tx

      tx = await muuu.approve(
        PARAMS.muuuLockerV2,
        ethers.utils.parseUnits(_amount),
      )
      await tx.wait()

      tx = await locker.lock(
        signer.address, // account
        ethers.utils.parseUnits(_amount), // amount
        '0', // spendRatio
      )
      await tx.wait()

      await hre.run('lockers-for-test:balance-of-in-locker', {
        deployerAddress: signer.address,
      })
    },
  )

task(
  'lockers-for-test:balance-of-in-locker',
  'lockers-for-test:balance-of-in-locker',
)
  .addOptionalParam('deployerAddress', 'deployerAddress')
  .setAction(async ({ deployerAddress }, hre: HardhatRuntimeEnvironment) => {
    const { network, ethers } = hre
    console.log(`network: ${network.name}`)
    const signer = deployerAddress
      ? await ethers.getSigner(deployerAddress)
      : (await ethers.getSigners())[0]
    const locker = MuuuLockerV2__factory.connect(PARAMS.muuuLockerV2, signer)
    const votingBalanceV2Gauges = VotingBalanceV2Gauges__factory.connect(
      PARAMS.votingBalanceV2Gauges,
      signer,
    )

    console.log(
      `locker.balanceOf ... ${ethers.utils.formatUnits(
        await locker.balanceOf(signer.address),
      )}`,
    )
    console.log(
      `locker.lockedBalanceOf ... ${ethers.utils.formatUnits(
        await locker.lockedBalanceOf(signer.address),
      )}`,
    )
    // console.log(`locker.lockedBalances`)
    // console.log(await locker.lockedBalances(signer.address))
    console.log(
      `votingBalanceV2Gauges.balanceOf ... ${ethers.utils.formatUnits(
        await votingBalanceV2Gauges.balanceOf(signer.address),
      )}`,
    )
  })

task(
  'lockers-for-test:balances-used-by-voting-balance',
  'lockers-for-test:balances-used-by-voting-balance',
)
  .addOptionalParam('deployerAddress', 'deployerAddress')
  .setAction(async ({ deployerAddress }, hre: HardhatRuntimeEnvironment) => {
    const { network, ethers } = hre
    const signer = deployerAddress
      ? await ethers.getSigner(deployerAddress)
      : (await ethers.getSigners())[0]
    const locker = MuuuLockerV2__factory.connect(PARAMS.muuuLockerV2, signer)

    const epochCount = (await locker.epochCount()).toNumber()
    for (let i = 0; i < epochCount; i++) {
      console.log(`> epochs ${epochCount - i - 1}`)
      console.log(
        `locker.balanceAtEpochOf ... ${ethers.utils.formatUnits(
          await locker.balanceAtEpochOf(epochCount - i - 1, signer.address),
        )}`,
      )
      console.log(
        `locker.pendingLockAtEpochOf ... ${ethers.utils.formatUnits(
          await locker.pendingLockAtEpochOf(epochCount - i - 1, signer.address),
        )}`,
      )
    }
  })

task(
  'lockers-for-test:process-expired-locks',
  'lockers-for-test:process-expired-locks',
)
  .addOptionalParam('deployerAddress', 'deployerAddress')
  .setAction(async ({ deployerAddress }, hre: HardhatRuntimeEnvironment) => {
    const { network, ethers } = hre
    const signer = deployerAddress
      ? await ethers.getSigner(deployerAddress)
      : (await ethers.getSigners())[0]
    const locker = MuuuLockerV2__factory.connect(PARAMS.muuuLockerV2, signer)
    const tx = await locker.processExpiredLocks(false)
    await tx.wait()
  })
