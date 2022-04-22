// tokens
const _deployMintableERC20 = async ({
  name,
  symbol,
  decimals,
  deployer,
  artifacts,
}) => {
  const MintableERC20 = artifacts.require('MintableERC20')
  return await MintableERC20.new(name, symbol, decimals, {
    from: deployer,
  })
}

const deployKglToken = async ({ deployer, artifacts }) =>
  await _deployMintableERC20({
    name: 'Kagle DAO Token',
    symbol: 'KGL',
    decimals: 18,
    deployer: deployer,
    artifacts: artifacts,
  })

const deployThreeKglToken = async ({ deployer, artifacts }) =>
  await _deployMintableERC20({
    name: 'Kagla.fi DAI/USDC/USDT',
    symbol: '3Kgl',
    decimals: 18,
    deployer: deployer,
    artifacts: artifacts,
  })

const deployDaiToken = async ({ deployer, artifacts }) =>
  await _deployMintableERC20({
    name: 'Dai Stablecoin',
    symbol: 'DAI',
    decimals: 18,
    deployer: deployer,
    artifacts: artifacts,
  })

const deployWethToken = async ({ deployer, artifacts }) =>
  await _deployMintableERC20({
    name: 'Wrapped Ether',
    symbol: 'WETH',
    decimals: 18,
    deployer: deployer,
    artifacts: artifacts,
  })

// Kagla
const deployMockKaglaGaugeController = async ({
  deployer,
  artifacts,
}) => {
  const MockGaugeController = artifacts.require('MockGaugeController')
  return await MockGaugeController.new({
    from: deployer,
  })
}

const deployMockKaglaVotingEscrow = async ({ deployer, artifacts }) =>
  await artifacts.require('MockKaglaVoteEscrow').new({ from: deployer })

const deployMockKaglaRegistry = async ({
  pool,
  gauge,
  lpToken,
  deployer,
  artifacts,
}) => {
  const Artifact = artifacts.require('MockKaglaRegistry')
  return await Artifact.new(pool, gauge, lpToken, {
    from: deployer,
  })
}

const deployMockKaglaFeeDistributor = async ({
  tokenAddress,
  deployer,
  artifacts,
}) => {
  const Artifact = artifacts.require('MockKaglaFeeDistributor')
  return await Artifact.new(tokenAddress, {
    from: deployer,
  })
}

const deployMockKaglaAddressProvider = async ({
  registryAddress,
  feeDistributorAddress,
  deployer,
  artifacts,
}) => {
  const Artifact = artifacts.require('MockKaglaAddressProvider')
  return await Artifact.new(registryAddress, feeDistributorAddress, {
    from: deployer,
  })
}

module.exports = {
  deployKglToken: deployKglToken,
  deployThreeKglToken: deployThreeKglToken,
  deployDaiToken: deployDaiToken,
  deployWethToken: deployWethToken,
  deployMockKaglaGaugeController: deployMockKaglaGaugeController,
  deployMockKaglaVotingEscrow: deployMockKaglaVotingEscrow,
  deployMockKaglaRegistry: deployMockKaglaRegistry,
  deployMockKaglaFeeDistributor: deployMockKaglaFeeDistributor,
  deployMockKaglaAddressProvider: deployMockKaglaAddressProvider,
}
