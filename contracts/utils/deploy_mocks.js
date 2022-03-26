const MintableERC20 = artifacts.require('MintableERC20')

const _deployMintableERC20 = async ({ name, symbol, decimals, deployer }) =>
  await MintableERC20.new(name, symbol, decimals, {
    from: deployer,
  })

const deployKglToken = async ({ deployer }) =>
  await _deployMintableERC20({
    name: 'Kagle DAO Token',
    symbol: 'KGL',
    decimals: 18,
    deployer: deployer,
  })

const deployThreeKglToken = async ({ deployer }) =>
  await _deployMintableERC20({
    name: 'Kagla.fi DAI/USDC/USDT',
    symbol: '3Kgl',
    decimals: 18,
    deployer: deployer,
  })

const deployDaiToken = async ({ deployer }) =>
  await _deployMintableERC20({
    name: 'Dai Stablecoin',
    symbol: 'DAI',
    decimals: 18,
    deployer: deployer,
  })

const deployWethToken = async ({ deployer }) =>
  await _deployMintableERC20({
    name: 'Wrapped Ether',
    symbol: 'WETH',
    decimals: 18,
    deployer: deployer,
  })

module.exports = {
  deployKglToken: deployKglToken,
  deployThreeKglToken: deployThreeKglToken,
  deployDaiToken: deployDaiToken,
  deployWethToken: deployWethToken,
}
