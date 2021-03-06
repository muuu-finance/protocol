// const { BN, constants, expectEvent, expectRevert, time } = require('@openzeppelin/test-helpers');
const { BN, time } = require('@openzeppelin/test-helpers')
var jsonfile = require('jsonfile')
var contractList = jsonfile.readFileSync('./contracts.json')

const Booster = artifacts.require('Booster')
const MuuuLocker = artifacts.require('MuuuLocker')
const MuuuStakingProxy = artifacts.require('MuuuStakingProxy')
const muuuRewardPool = artifacts.require('MuuuRewardPool')
const IERC20 = artifacts.require('IERC20')

contract('Deploy MUUU Locker', async (accounts) => {
  it('should setup lock contract', async () => {
    let deployer = '0x947B7742C403f20e5FaCcDAc5E092C943E7D0277'
    let multisig = '0xa3C5A1e09150B75ff251c1a7815A07182c3de2FB'
    let treasury = '0x1389388d01708118b497f59521f6943Be2541bb7'
    let addressZero = '0x0000000000000000000000000000000000000000'

    //system
    let booster = await Booster.at(contractList.system.booster)
    let muuu = await IERC20.at(contractList.system.muuu)
    let mukgl = await IERC20.at(contractList.system.muKgl)
    let muuurewards = await muuuRewardPool.at(contractList.system.muuuRewards)
    let mukglrewards = await muuuRewardPool.at(contractList.system.muKglRewards)
    let kgl = await IERC20.at('0xD533a949740bb3306d119CC777fa900bA034cd52')

    //deploy
    let locker = await MuuuLocker.new({ from: deployer })
    let stakeproxy = await MuuuStakingProxy.new(locker.address, {
      from: deployer,
    })
    console.log('deployed')
    console.log('locker: ' + locker.address)
    console.log('stakeproxy: ' + stakeproxy.address)
    contractList.system.locker = locker.address
    contractList.system.lockerStakeProxy = stakeproxy.address
    jsonfile.writeFileSync('./contracts.json', contractList, { spaces: 4 })
    await stakeproxy.setApprovals()
    await locker.addReward(mukgl.address, stakeproxy.address, true, {
      from: deployer,
    })
    await locker.setStakingContract(stakeproxy.address, { from: deployer })
    await locker.setApprovals()
    await locker.transferOwnership(multisig, { from: deployer })
    await locker.owner().then((a) => console.log('owner: ' + a))

    console.log('redirect extra incentives..')
    let setTreasuryData = booster.contract.methods
      .setTreasury(stakeproxy.address)
      .encodeABI()
    console.log('setTreasuryData: ' + setTreasuryData)

    let setFeesData = booster.contract.methods
      .setFees(1000, 500, 100, 100)
      .encodeABI()
    console.log('setFeesData: ' + setFeesData)

    //quick test that fees are going to their new home
    // await booster.setTreasury(stakeproxy.address,{from:multisig,gasPrice:0});
    // await booster.setFees(1000, 500, 100, 100,{from:multisig,gasPrice:0});

    // console.log("test harvest");
    // await booster.earmarkRewards(38);

    // await kgl.balanceOf(stakeproxy.address).then(a=>console.log("extra incentive on stakeproxy: " +a))
    // await mukgl.balanceOf(locker.address).then(a=>console.log("mukgl on locker: " +a))

    // await stakeproxy.distribute();
    // await kgl.balanceOf(stakeproxy.address).then(a=>console.log("kgl on stakeproxy: " +a))
    // await kgl.balanceOf(locker.address).then(a=>console.log("kgl incentive on locker: " +a))
    // await mukgl.balanceOf(locker.address).then(a=>console.log("mukgl on locker: " +a))

    console.log('setup complete')
  })
})
