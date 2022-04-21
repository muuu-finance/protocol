import { expect } from "chai"
import { ethers } from "hardhat"
import { StashFactoryV2__factory } from "../types"

const prepare = async () => {
  const [deployer] = await ethers.getSigners()
  const _instance = await new StashFactoryV2__factory(deployer).deploy(
    ethers.constants.AddressZero,
    ethers.constants.AddressZero,
    ethers.constants.AddressZero
  )
  await _instance.deployTransaction.wait()
  return {
    deployer,
    stashFactoryV2: _instance
  }
}

describe('StashFactoryV2', () => {
  it(".constructor", async () => {
    const { stashFactoryV2 } = await prepare()
    const [operator, rewardFactory, proxyFactory, v1Impl, v2Impl, v3Impl] = await Promise.all([
      stashFactoryV2.operator(),
      stashFactoryV2.rewardFactory(),
      stashFactoryV2.proxyFactory(),
      stashFactoryV2.v1Implementation(),
      stashFactoryV2.v2Implementation(),
      stashFactoryV2.v3Implementation(),
    ])
    expect(operator).to.equal(ethers.constants.AddressZero)
    expect(rewardFactory).to.equal(ethers.constants.AddressZero)
    expect(proxyFactory).to.equal(ethers.constants.AddressZero)
    expect(v1Impl).to.equal(ethers.constants.AddressZero)
    expect(v2Impl).to.equal(ethers.constants.AddressZero)
    expect(v3Impl).to.equal(ethers.constants.AddressZero)
  })
})
