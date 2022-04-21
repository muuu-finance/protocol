import { expect } from "chai"
import { Signer, Wallet } from "ethers";
import { ethers } from "hardhat"
import * as DeployHelper from "../../helpers/contracts-deploy-helpers";
import { Booster, ERC20__factory, ExtraRewardStashV3__factory, ProxyFactory__factory, StashFactoryV2, StashFactoryV2__factory } from "../../types"

const createRandomAddress = () => Wallet.createRandom().address;

const fullSetup = async () => {
  const [deployer] = await ethers.getSigners()

  // setup Booster
  const kgl = await new ERC20__factory(deployer).deploy(
    'Kagle DAO Token',
    'KGL',
  )
  await kgl.deployTransaction.wait()
  const voterProxy = await DeployHelper.deployKaglaVoterProxy({
    deployer,
    kgl: kgl.address,
    votingEscrow: ethers.constants.AddressZero,
    gaugeController: ethers.constants.AddressZero,
    tokenMinter: ethers.constants.AddressZero,
  })
  const booster = await DeployHelper.deployBooster({
    deployer,
    staker: voterProxy.address,
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
  const proxyFactory = await new ProxyFactory__factory(deployer).deploy()
  await proxyFactory.deployTransaction.wait()
  const sFactory = await new StashFactoryV2__factory(deployer).deploy(
    booster.address,
    rFactory.address,
    proxyFactory.address
  )
  await sFactory.deployTransaction.wait()

  // setup Booster / VoterProxy to enable to add pool
  await (await voterProxy.setOperator(booster.address))
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

const setImplementationToStashFactoryV2 = async ({stashFactoryV2, operator, deployer}: {stashFactoryV2: StashFactoryV2, operator: Signer, deployer: Signer}) => {
  const _instance = stashFactoryV2.connect(operator)
  const v3 = await new ExtraRewardStashV3__factory(deployer).deploy()
  await v3.deployTransaction.wait()
  await (await _instance.setImplementation(
    ethers.constants.AddressZero,
    ethers.constants.AddressZero,
    v3.address
  ))
  return {
    v3Implementation: v3
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

  describe("StashFactoryV2#CreateStash", () => {
    it("success", async () => {
      const { booster, deployer, sFactory } = await fullSetup()
      await setImplementationToStashFactoryV2({
        stashFactoryV2: sFactory,
        operator: deployer,
        deployer
      })
      
      const lpToken = await new ERC20__factory(deployer).deploy(
        'Dummy LP Token',
        'DUMMY',
      )
      const gauge = createRandomAddress()
      await expect(booster.connect(deployer).addPool(
        lpToken.address,
        gauge,
        3
      )).to.emit(booster, "PoolAdded").withArgs(lpToken.address, gauge, 3)
    })
  })
})
