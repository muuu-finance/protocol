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

const getFilePath = (network) => `./contract-mocks-${network}.json`
const GROUP = 'tokenMocks'
module.exports = async (callback) => {
  const { network } = config
  const filePath = getFilePath(network)

  console.log(`--- START ---`)
  const [deployer] = await web3.eth.getAccounts()
  console.log(`network name: ${network}`)
  console.log(`deployer address: ${deployer}`)

  console.log(`--- start deployments ---`)

  // NOTE: stop this codes by nw performance, use later codes instead
  // const tokens = await Promise.all([
  //   deployKglToken({ deployer: deployer, artifacts: artifacts }),
  //   deployThreeKglToken({ deployer: deployer, artifacts: artifacts }),
  //   deployDaiToken({ deployer: deployer, artifacts: artifacts }),
  //   deployWethToken({ deployer: deployer, artifacts: artifacts }),
  // ])
  const kglToken = await deployKglToken({
    deployer: deployer,
    artifacts: artifacts,
  })
  console.log(`> deployed kgl`)
  const threeKglToken = await deployThreeKglToken({
    deployer: deployer,
    artifacts: artifacts,
  })
  console.log(`> deployed 3kgl`)
  const dai = await deployDaiToken({ deployer: deployer, artifacts: artifacts })
  console.log(`> deployed dai`)
  const weth = await deployWethToken({
    deployer: deployer,
    artifacts: artifacts,
  })
  console.log(`> deployed weth`)
  const tokens = [kglToken, threeKglToken, dai, weth]
  console.log(`--- finished deployments ---`)

  fs.writeFileSync(filePath, JSON.stringify({}, null, 2))
  console.log(`> tokens`)
  for (let token of tokens) {
    const symbol = await token.symbol()
    console.log(`- - - - - -`)
    console.log(`name: ${await token.name()}`)
    console.log(`symbol: ${symbol}`)
    console.log(`decimal: ${(await token.decimals()).toString()}`)
    console.log(`- - - - - -`)
    writeContractAddress(GROUP, symbol, token.address, filePath)
  }
  console.log(`> addresses in ${filePath}`)
  console.log(readContractAddresses(filePath))
  console.log(`--- FINISHED ---`)
  callback()
}
