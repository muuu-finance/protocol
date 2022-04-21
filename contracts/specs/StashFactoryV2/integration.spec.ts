import { expect } from "chai"
import { Signer, Wallet } from "ethers";
import { ethers } from "hardhat"
import * as DeployHelper from "../../helpers/contracts-deploy-helpers";
import { BaseRewardPool__factory, Booster, ERC20__factory, ExtraRewardStashV3__factory, MockKaglaLiquidityGaugeV3__factory, ProxyFactory__factory, StashFactoryV2, StashFactoryV2__factory } from "../../types"

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
    deployer,
    booster,
    voterProxy,
    rFactory,
    sFactory,
    tFactory,
  }
}

const setImplementationToStashFactoryV2 = async ({stashFactoryV2, operator, deployer}: {stashFactoryV2: StashFactoryV2, operator: Signer, deployer: Signer}) => {
  const _instance = stashFactoryV2.connect(operator)
  const v3 = await new ExtraRewardStashV3__factory(deployer).deploy()
  await v3.deployTransaction.wait()
  await (await _instance.setImplementation(v3.address))
  return {
    v3Implementation: v3
  }
}

const generateInputForAddPool = async (deployer: Signer) => {
  const lpToken = await new ERC20__factory(deployer).deploy(
    'Dummy LP Token',
    'DUMMY',
  )
  await lpToken.deployTransaction.wait()
  const gauge = await new MockKaglaLiquidityGaugeV3__factory(deployer).deploy()
  await gauge.deployTransaction.wait()
  return {
    lpToken, gauge
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
    const setupWithSettingImplementation = async () => {
      const { deployer, booster, sFactory } = await fullSetup()
      await setImplementationToStashFactoryV2({
        stashFactoryV2: sFactory,
        operator: deployer,
        deployer
      })
      return { deployer, booster }
    }

    describe("success", () => {
      it("success & emit event (PoolAdded) by Booster#addPool", async () => {
        const { booster, deployer } = await setupWithSettingImplementation()
  
        const { lpToken, gauge } = await generateInputForAddPool(deployer)
        await expect(booster.connect(deployer).addPool(
          lpToken.address,
          gauge.address,
          3
        )).to.emit(booster, "PoolAdded").withArgs(lpToken.address, gauge.address, 3)
      })

      it("check created ExtraRewardStashV3", async () => {
        const { deployer, booster } = await setupWithSettingImplementation()
  
        // Booster#addPool
        const { lpToken, gauge } = await generateInputForAddPool(deployer)
        await (await booster.connect(deployer).addPool(
          lpToken.address,
          gauge.address,
          3
        )).wait()

        // check ExtraRewardStashV3 created by Booster#addPool
        const poolInfo = await booster.connect(ethers.provider).poolInfo(0)
        expect(poolInfo.lptoken).to.equal(lpToken.address)
        const stashInstance = ExtraRewardStashV3__factory.connect(poolInfo.stash, ethers.provider)
        const [_pid, _operator, _staker, _gauge, _rewardFactory] = await Promise.all([
          stashInstance.pid(),
          stashInstance.operator(),
          stashInstance.staker(),
          stashInstance.gauge(),
          stashInstance.rewardFactory(),
        ])
        expect(_pid).to.equal(0)
        expect(_operator).to.equal(booster.address)
        expect(_staker).to.equal(await booster.staker())
        expect(_gauge).to.equal(gauge.address)
        expect(_rewardFactory).to.equal(await booster.rewardFactory())
      })
    })

    describe("failure", () => {
      it("when no setImplementation", async () => {
        const { deployer, booster } = await fullSetup()

        const { lpToken, gauge } = await generateInputForAddPool(deployer)
        await expect(booster.connect(deployer).addPool(
          lpToken.address,
          gauge.address,
          3
        )).to.be.revertedWith("0 impl")
      })

      it("when stashVersion = 3", async () => {
        const { deployer, booster } = await fullSetup()

        const { lpToken, gauge } = await generateInputForAddPool(deployer)
        await expect(booster.connect(deployer).addPool(
          lpToken.address,
          gauge.address,
          3
        )).to.be.revertedWith("0 impl")
      })

      describe("when stashVersion != 3", () => {
        const boolInfoAfterAddingPool = async (_stashVersion: number) => {
          const { booster, deployer } = await setupWithSettingImplementation()
          const { lpToken, gauge } = await generateInputForAddPool(deployer)
          await (await booster.connect(deployer).addPool(
            lpToken.address,
            gauge.address,
            _stashVersion
          )).wait()
          return await booster.connect(ethers.provider).poolInfo(0)
        }

        it(
          "when stashVersion = 0",
          async () => await expect((await boolInfoAfterAddingPool(0)).stash)
            .to.equal(ethers.constants.AddressZero)
        )
        it(
          "when stashVersion = 1",
          async () => await expect((await boolInfoAfterAddingPool(1)).stash)
            .to.equal(ethers.constants.AddressZero)
        )
        it(
          "when stashVersion = 2",
          async () => await expect((await boolInfoAfterAddingPool(2)).stash)
            .to.equal(ethers.constants.AddressZero)
        )
        it(
          "when stashVersion = 4",
          async () => await expect((await boolInfoAfterAddingPool(4)).stash)
            .to.equal(ethers.constants.AddressZero)
        )
      })
    })
  })

  describe("ExtraRewardStashV3#setExtraReward after added pool", () => {
    const setupUntilAddPool = async () => {
      const { deployer, booster, sFactory } = await fullSetup()
      await setImplementationToStashFactoryV2({
        stashFactoryV2: sFactory,
        operator: deployer,
        deployer
      })
      const { lpToken, gauge } = await generateInputForAddPool(deployer)
      await (await booster.connect(deployer).addPool(
        lpToken.address,
        gauge.address,
        3
      )).wait()
      const poolInfo = await booster.connect(ethers.provider).poolInfo(0)
      const extraRewardStashV3 = ExtraRewardStashV3__factory.connect(poolInfo.stash, ethers.provider)

      return { deployer, booster, extraRewardStashV3 }
    }

    it("success", async () => {
      const { deployer, booster, extraRewardStashV3 } = await setupUntilAddPool()

      // check prerequisites
      expect(deployer.address).to.equal(await booster.owner())

      // create mock token to use extra reward
      const extraRewardTokens = await Promise.all([
        new ERC20__factory(deployer).deploy(
          'ExtraRewardTokenA',
          'extraA',
        ),
        new ERC20__factory(deployer).deploy(
          'ExtraRewardTokenB',
          'extraB',
        )
      ])
      const [extraRewardTokenA, extraRewardTokenB] = extraRewardTokens
      await Promise.all([
        extraRewardTokenA.deployTransaction.wait(),
        extraRewardTokenB.deployTransaction.wait()
      ])

      // testing
      const _extraRewardStashV3 = extraRewardStashV3.connect(deployer)
      await (await _extraRewardStashV3.setExtraReward(extraRewardTokenA.address)).wait()
      await (await _extraRewardStashV3.setExtraReward(extraRewardTokenB.address)).wait()

      // check
      expect(await _extraRewardStashV3.tokenCount()).to.equal(2)

      const poolInfo = await booster.connect(ethers.provider).poolInfo(0)
      const kglRewards = BaseRewardPool__factory.connect(poolInfo.kglRewards, ethers.provider)
      const extraRewardsLength = await kglRewards.extraRewardsLength()
      expect(extraRewardsLength.toNumber()).to.equal(2)

      const tokenInfos = await Promise.all([
        _extraRewardStashV3.tokenInfo(extraRewardTokenA.address),
        _extraRewardStashV3.tokenInfo(extraRewardTokenB.address),
      ])
      const extraRewardsInKglRewards = await Promise.all(
        [...Array(extraRewardsLength.toNumber())].map((_, i) => kglRewards.extraRewards(i))
      )
      for (const [i, tokenInfo] of tokenInfos.entries()) {
        expect(tokenInfo.token).to.equal(extraRewardTokens[i].address)
        expect(tokenInfo.rewardAddress).to.equal(extraRewardsInKglRewards[i])
      }
    })
  })
})
