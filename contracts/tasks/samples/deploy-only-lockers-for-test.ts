import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { deployMuuuLockerV2, deployMuuuToken, deployVotingBalanceV2Gauges } from '../../helpers/contracts-deploy-helpers'
import { MuuuLockerV2__factory, MuuuToken__factory, VotingBalanceV2Gauges__factory } from '../../types'

task('deploy-only-lockers-for-test', 'deploy-only-lockers-for-test').setAction(async ({}, hre: HardhatRuntimeEnvironment) => {
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
    ethers.utils.parseUnits((50 * 1000000).toString())
  )
  await tx.wait()

  console.log({
    muuuToken: muuuToken.address,
    muuuLockerV2: muuuLockerV2.address,
    votingBalanceV2Gauges: votingBalanceV2Gauges.address
  })

  console.log(`--- [deploy-only-lockers-for-test] FINISHED ---`)
})

const PARAMS = {
  muuuToken: '0x7c2C195CD6D34B8F845992d380aADB2730bB9C6F',
  muuuLockerV2: '0x8858eeB3DfffA017D4BCE9801D340D36Cf895CCf',
  votingBalanceV2Gauges: '0x0078371BDeDE8aAc7DeBfFf451B74c5EDB385Af7'
}

task('lockers-for-test:increase-time', 'lockers-for-test:increase-time').setAction(async ({}, hre: HardhatRuntimeEnvironment) => {
  const { network, ethers } = hre
  console.log(`network: ${network.name}`)
  await ethers.provider.send("evm_increaseTime", [60 * 5])
  await ethers.provider.send("evm_mine", [])
  console.log(`--- CurrentTime ---`)
  const currentBlockNumber = await ethers.provider.getBlockNumber()
  console.log(currentBlockNumber)
  const block = await ethers.provider.getBlock(currentBlockNumber)
  console.log(new Date(block.timestamp * 1000))
})

task('lockers-for-test:current-lockerV2', 'lockers-for-test:current-lockerV2').setAction(async ({}, hre: HardhatRuntimeEnvironment) => {
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
    ethers.provider
  )
  console.log(`totalSupply ... ${ethers.utils.formatUnits(await _locker.totalSupply())}`)
  const epochCount = (await _locker.epochCount()).toNumber()
  for (let i = 0; i < epochCount; i++) {
    console.log(`> epochs ${epochCount - i - 1}`)
    const epoch = await _locker.epochs(epochCount - i - 1)
    // console.log(epoch)
    console.log("- supply")
    console.log(ethers.utils.formatUnits(epoch.supply))
    console.log("- date")
    console.log(new Date(epoch.date * 1000))
  }
})

task('lockers-for-test:confirm-balance-of-muuu', 'lockers-for-test:confirm-balance-of-muuu').setAction(async ({}, hre: HardhatRuntimeEnvironment) => {
  const { network, ethers } = hre
  console.log(`network: ${network.name}`)
  const accounts = await hre.ethers.getSigners()
  const muuu = MuuuToken__factory.connect(PARAMS.muuuToken, ethers.provider)
  const locker = MuuuLockerV2__factory.connect(PARAMS.muuuLockerV2, ethers.provider)

  console.log(`MUUU maxSupply ... ${hre.ethers.utils.formatUnits(await muuu.maxSupply())}`)
  console.log(`MUUU totalSupply ... ${hre.ethers.utils.formatUnits(await muuu.totalSupply())}`)
  for (const account of accounts) {
    console.log(`------------------------------------------`)
    console.log(`account ... ${await account.address}`)
    // console.log(`balance ... ${hre.ethers.utils.formatUnits(await account.getBalance())}`)
    console.log(`MUUU balance ... ${hre.ethers.utils.formatUnits(await muuu.balanceOf(account.address))}`)
    console.log(`vlMUUU balance ... ${hre.ethers.utils.formatUnits(await locker.balanceOf(account.address))}`)
  }
})

task(
  'lockers-for-test:lock-muuu',
  'lockers-for-test:lock-muuu'
).addOptionalParam(
  'deployerAddress', "deployerAddress"
).addOptionalParam(
  'amount', "minting muuu amount"
).setAction(async ({ deployerAddress, amount }, hre: HardhatRuntimeEnvironment) => {
  const { network, ethers } = hre
  console.log(`network: ${network.name}`)
  const signer = deployerAddress
    ? await ethers.getSigner(deployerAddress)
    : (await ethers.getSigners())[0]
  const _amount = amount ? amount : "0.005"
  
  const muuu = MuuuToken__factory.connect(PARAMS.muuuToken, signer)
  const locker = MuuuLockerV2__factory.connect(PARAMS.muuuLockerV2, signer)
  let tx;
  
  tx = await muuu.approve(PARAMS.muuuLockerV2, ethers.utils.parseUnits(_amount))
  await tx.wait()

  tx = await locker.lock(
    signer.address, // account
    ethers.utils.parseUnits(_amount), // amount
    "0" // spendRatio
  )
  await tx.wait()

  await hre.run("lockers-for-test:balance-of-in-locker", { deployerAddress: signer.address })
})

task(
  'lockers-for-test:balance-of-in-locker',
  'lockers-for-test:balance-of-in-locker'
).addOptionalParam(
  'deployerAddress', "deployerAddress"
).setAction(async ({ deployerAddress }, hre: HardhatRuntimeEnvironment) => {
  const { network, ethers } = hre
  console.log(`network: ${network.name}`)
  const signer = deployerAddress
    ? await ethers.getSigner(deployerAddress)
    : (await ethers.getSigners())[0]
  const locker = MuuuLockerV2__factory.connect(PARAMS.muuuLockerV2, signer)
  const votingBalanceV2Gauges = VotingBalanceV2Gauges__factory.connect(PARAMS.votingBalanceV2Gauges, signer)

  console.log(`locker.balanceOf ... ${ethers.utils.formatUnits(await locker.balanceOf(signer.address))}`)
  console.log(`locker.lockedBalanceOf ... ${ethers.utils.formatUnits(await locker.lockedBalanceOf(signer.address))}`)
  // console.log(`locker.lockedBalances`)
  // console.log(await locker.lockedBalances(signer.address))
  console.log(`votingBalanceV2Gauges.balanceOf ... ${ethers.utils.formatUnits(await votingBalanceV2Gauges.balanceOf(signer.address))}`)
})

task(
  'lockers-for-test:balances-used-by-voting-balance',
  'lockers-for-test:balances-used-by-voting-balance'
).addOptionalParam(
  'deployerAddress', "deployerAddress"
).setAction(async ({ deployerAddress }, hre: HardhatRuntimeEnvironment) => {
  const { network, ethers } = hre
  const signer = deployerAddress
    ? await ethers.getSigner(deployerAddress)
    : (await ethers.getSigners())[0]
  const locker = MuuuLockerV2__factory.connect(PARAMS.muuuLockerV2, signer)

  const epochCount = (await locker.epochCount()).toNumber()
  for (let i = 0; i < epochCount; i++) {
    console.log(`> epochs ${epochCount - i - 1}`)
    console.log(`locker.balanceAtEpochOf ... ${ethers.utils.formatUnits(await locker.balanceAtEpochOf(epochCount - i - 1, signer.address))}`)
    console.log(`locker.pendingLockAtEpochOf ... ${ethers.utils.formatUnits(await locker.pendingLockAtEpochOf(epochCount - i - 1, signer.address))}`)
  }
})
