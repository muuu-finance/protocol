const fs = require('fs')
const {
  deployKglToken,
  deployThreeKglToken,
  deployDaiToken,
  deployWethToken,
} = require('../utils/deploy_mocks')
const {
  writeContractAddress,
  readContractAddresses,
} = require('../utils/access_contracts_json')

const FILE_PATH = './contract-mocks.json'
const GROUP = 'tokenMocks'
module.exports = async (callback) => {
  console.log(`--- START ---`)
  const [deployer] = await web3.eth.getAccounts()
  console.log(`deployer address: ${deployer}`)

  console.log(`--- start deployments ---`)
  const tokens = await Promise.all([
    deployKglToken({ deployer: deployer, artifacts: artifacts }),
    deployThreeKglToken({ deployer: deployer, artifacts: artifacts }),
    deployDaiToken({ deployer: deployer, artifacts: artifacts }),
    deployWethToken({ deployer: deployer, artifacts: artifacts }),
  ])
  console.log(`--- finished deployments ---`)

  fs.writeFileSync(FILE_PATH, JSON.stringify({}, null, 2))
  console.log(`> tokens`)
  for (let token of tokens) {
    const symbol = await token.symbol()
    console.log(`- - - - - -`)
    console.log(`name: ${await token.name()}`)
    console.log(`symbol: ${symbol}`)
    console.log(`decimal: ${(await token.decimals()).toString()}`)
    console.log(`- - - - - -`)
    writeContractAddress(GROUP, symbol, token.address, FILE_PATH)
  }
  console.log(`> addresses in ${FILE_PATH}`)
  console.log(readContractAddresses(FILE_PATH))
  console.log(`--- FINISHED ---`)
  callback()
}
