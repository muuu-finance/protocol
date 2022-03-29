require('dotenv').config()

const MNEMONIC = process.env.MNEMONIC || ''
const ETHERSCAN_KEY = process.env.ETHERSCAN_KEY || ''

const BWARE_LABS_KEY = process.env.BWARE_LABS_KEY || '' // if use BwareLabs for Astar, set this parameter
const getAstarNetworkUrl = (networkName) =>
  BWARE_LABS_KEY
    ? `https://${networkName}-api.bwarelabs.com/${BWARE_LABS_KEY}`
    : `https://rpc.${
        networkName === 'astar' ? 'astar' : `${networkName}.astar`
      }.network:8545`

const INFURA_KEY = process.env.INFURA_KEY || '' // if use Infura, set this parameter
const ALCHEMY_KEY = process.env.ALCHEMY_KEY || '' // if use Alchemy, set this parameter
const getEthereumNetworkUrl = (networkName) =>
  INFURA_KEY
    ? `https://${networkName}.infura.io/v3/${INFURA_KEY}`
    : `https://eth-${networkName}.alchemyapi.io/v2/${ALCHEMY_KEY}`

module.exports = {
  MNEMONIC: MNEMONIC,
  ETHERSCAN_KEY: ETHERSCAN_KEY,
  getAstarNetworkUrl: getAstarNetworkUrl,
  getEthereumNetworkUrl: getEthereumNetworkUrl
}
