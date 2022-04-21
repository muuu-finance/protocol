import { expect } from "chai"
import { Signer, Wallet } from "ethers";
import { ethers } from "hardhat"
import * as DeployHelper from "../helpers/contracts-deploy-helpers";
import { StashFactoryV2__factory } from "../types"

const createRandomAddress = () => Wallet.createRandom().address;

const deployBooster = async (deployer: Signer) => DeployHelper.deployBooster({
  deployer,
  staker: ethers.constants.AddressZero,
  minter: ethers.constants.AddressZero,
  kgl: ethers.constants.AddressZero,
  registry: ethers.constants.AddressZero,
})

const prepare = async ({ operator, rewardFactory, proxyFactory }: { operator?: string, rewardFactory?: string, proxyFactory?: string } = {}) => {
  const [deployer] = await ethers.getSigners()
  const _instance = await new StashFactoryV2__factory(deployer).deploy(
    operator || ethers.constants.AddressZero,
    rewardFactory || ethers.constants.AddressZero,
    proxyFactory || ethers.constants.AddressZero
  )
  await _instance.deployTransaction.wait()
  return {
    deployer,
    stashFactoryV2: _instance
  }
}

describe('StashFactoryV2', () => {
  it(".constructor", async () => {
    const inputtedOperator = createRandomAddress();
    const inputtedRewardFactory = createRandomAddress();
    const inputtedProxyFactory = createRandomAddress();
    const { stashFactoryV2 } = await prepare({
      operator: inputtedOperator,
      rewardFactory: inputtedRewardFactory,
      proxyFactory: inputtedProxyFactory
    })
    const [operator, rewardFactory, proxyFactory, v1Impl, v2Impl, v3Impl] = await Promise.all([
      stashFactoryV2.operator(),
      stashFactoryV2.rewardFactory(),
      stashFactoryV2.proxyFactory(),
      stashFactoryV2.v1Implementation(),
      stashFactoryV2.v2Implementation(),
      stashFactoryV2.v3Implementation(),
    ])
    expect(operator).to.equal(inputtedOperator)
    expect(rewardFactory).to.equal(inputtedRewardFactory)
    expect(proxyFactory).to.equal(inputtedProxyFactory)
    expect(v1Impl).to.equal(ethers.constants.AddressZero)
    expect(v2Impl).to.equal(ethers.constants.AddressZero)
    expect(v3Impl).to.equal(ethers.constants.AddressZero)
  })

  describe(",setImplementation", () => {
    it("when executer is operator", async () => {
      const [_, operator] = await ethers.getSigners()
      const booster = await deployBooster(operator)
      const { stashFactoryV2 } = await prepare({ operator: booster.address })
      const _instance = stashFactoryV2.connect(operator)

      const inputtedV1 = createRandomAddress();
      const inputtedV2 = createRandomAddress();
      const inputtedV3 = createRandomAddress();
  
      const tx = await _instance.setImplementation(inputtedV1, inputtedV2, inputtedV3)
      await tx.wait()

      const [v1Impl, v2Impl, v3Impl] = await Promise.all([
        stashFactoryV2.v1Implementation(),
        stashFactoryV2.v2Implementation(),
        stashFactoryV2.v3Implementation(),
      ])
      expect(v1Impl).to.equal(inputtedV1)
      expect(v2Impl).to.equal(inputtedV2)
      expect(v3Impl).to.equal(inputtedV3)
    })

    it("when executer is not operator", async () => {
      const [_, operator, notOperator] = await ethers.getSigners()
      const boosterByOperator = await deployBooster(operator)
      const { stashFactoryV2 } = await prepare({ operator: boosterByOperator.address })
      const _instance = stashFactoryV2.connect(notOperator)
  
      await expect(
        _instance.setImplementation(
          createRandomAddress(),
          createRandomAddress(),
          createRandomAddress(),
        )
      ).to.be.revertedWith("!auth")
    })
  })
})
