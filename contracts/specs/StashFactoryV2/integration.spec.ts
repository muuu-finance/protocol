import { expect } from "chai"
import { Signer, Wallet } from "ethers";
import { ethers } from "hardhat"
import * as DeployHelper from "../../helpers/contracts-deploy-helpers";
import { ERC20__factory, StashFactoryV2__factory } from "../../types"

const createRandomAddress = () => Wallet.createRandom().address;

const fullSetup = async () => {
  const [deployer] = await ethers.getSigners()

  // setup Booster
  const kgl = await new ERC20__factory(deployer).deploy(
    'Kagle DAO Token',
    'KGL',
  )
  await kgl.deployTransaction.wait()
  const staker = createRandomAddress()
  const booster = await DeployHelper.deployBooster({
    deployer,
    staker,
    minter: ethers.constants.AddressZero,
    kgl: kgl.address,
    registry: ethers.constants.AddressZero,
  })

  // deploy Factories
  const rFactory = await DeployHelper.deployRewardFactory({
    deployer,
    operator: booster.address,
    kgl: kgl.address
  })
  const tFactory = await DeployHelper.deployTokenFactory({
    deployer,
    operator: booster.address,
  })
  const sFactory = await new StashFactoryV2__factory(deployer).deploy(
    booster.address,
    rFactory.address,
    ethers.constants.AddressZero
  )
  await sFactory.deployTransaction.wait()

  // setup Booster to enable to add pool
  await (await booster.setPoolManager(deployer.address))
  await (await booster.setFactories(
    rFactory.address,
    sFactory.address,
    tFactory.address
  ))

  return {
    booster,
    deployer,
    rFactory,
    sFactory,
    tFactory,
  }
}

describe('StashFactoryV2 - integration', () => {
  it("check booster status by fullSetup", async () => {
    const { booster, deployer, rFactory, sFactory, tFactory } = await fullSetup()
    const _instance = booster.connect(ethers.provider)

    const [poolManager, rewardFactory, tokenFactory, stashFactory] = await Promise.all([
      _instance.poolManager(),
      _instance.rewardFactory(),
      _instance.tokenFactory(),
      _instance.stashFactory(),
    ])
    expect(poolManager).to.equal(deployer.address)
    expect(rewardFactory).to.equal(rFactory.address)
    expect(tokenFactory).to.equal(tFactory.address)
    expect(stashFactory).to.equal(sFactory.address)
  })
})
