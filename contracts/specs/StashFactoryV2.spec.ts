import { expect } from "chai"
import { Wallet } from "ethers";
import { ethers } from "hardhat"
import { StashFactoryV2__factory } from "../types"

const createRandomAddress = () => Wallet.createRandom().address;

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
})
