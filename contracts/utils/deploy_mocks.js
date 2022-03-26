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

module.exports = {
  deployKglToken: deployKglToken,
  deployThreeKglToken: deployThreeKglToken,
  deployDaiToken: deployDaiToken,
  deployWethToken: deployWethToken,
}
