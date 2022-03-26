const fs = require('fs')
const jsonfile = require('jsonfile')
const {
  deployMockKaglaGauge,
  deployMockKaglaVotingEscrow,
  deployMockKaglaRegistry,
  deployMockKaglaFeeDistributor,
  deployMockKaglaAddressProvider,
} = require('../utils/deploy_mocks')
const {
  writeContractAddress,
  readContractAddresses,
} = require('../utils/access_contracts_json')

const FILE_PATH = './contract-mocks.json'
const GROUP = 'kaglaMocks'
module.exports = async (callback) => {
  const deployedMocks = jsonfile.readFileSync(FILE_PATH)
  const threeKglTokenAddress = deployedMocks.mocks['3Kgl']

  console.log(`--- START ---`)
  const [deployer] = await web3.eth.getAccounts()
  console.log(`deployer address: ${deployer}`)

  const commonArgs = {
    deployer: deployer,
    artifacts: artifacts,
  }
  const votingEscrow = await deployMockKaglaVotingEscrow(commonArgs)
  const gauge = await deployMockKaglaGauge({
    threeKglTokenAddress: threeKglTokenAddress,
    ...commonArgs,
  })
  const feeDistributor = await deployMockKaglaFeeDistributor({
    tokenAddress: threeKglTokenAddress,
    ...commonArgs,
  })
  const registry = await deployMockKaglaRegistry({
    pool: threeKglTokenAddress, // temporary
    gauge: gauge.address,
    lpToken: threeKglTokenAddress,
    ...commonArgs,
  })
  const addressProvider = await deployMockKaglaAddressProvider({
    registryAddress: registry.address,
    feeDistributorAddress: feeDistributor.address,
    ...commonArgs,
  })

  const deployedInfos = [
    { key: 'votingEscrow', contract: votingEscrow },
    { key: 'gauge', contract: gauge },
    { key: 'feeDistributor', contract: feeDistributor },
    { key: 'registry', contract: registry },
    { key: 'addressProvider', contract: addressProvider },
  ]
  for (let info of deployedInfos) {
    writeContractAddress(GROUP, info.key, info.contract.address, FILE_PATH)
  }
  console.log(`> addresses in ${FILE_PATH}`)
  console.log(readContractAddresses(FILE_PATH))
  console.log(`--- FINISHED ---`)
  callback()
}
