const fs = require('fs')
const jsonfile = require('jsonfile')
const ethers = require('ethers')
const {
  deployMockKaglaGauge,
  deployMockKaglaGaugeController,
  deployMockKaglaVotingEscrow,
  deployMockKaglaRegistry,
  deployMockKaglaFeeDistributor,
  deployMockKaglaAddressProvider,
} = require('../utils/deploy_mocks')
const {
  writeContractAddress,
  readContractAddresses,
} = require('../utils/access_contracts_json')

const getFilePath = (network) => `./contract-mocks-${network}.json`
const GROUP = 'kaglaMocks'
module.exports = async (callback) => {
  const { network } = config
  const filePath = getFilePath(network)
  const deployedMocks = jsonfile.readFileSync(filePath)
  const threeKglTokenAddress = deployedMocks.tokenMocks['3Kgl']

  console.log(`--- START ---`)
  const [deployer] = await web3.eth.getAccounts()
  console.log(`network name: ${network}`)
  console.log(`deployer address: ${deployer}`)

  console.log(`--- start deployments ---`)
  const commonArgs = {
    deployer: deployer,
    artifacts: artifacts,
  }

  const votingEscrow = await deployMockKaglaVotingEscrow(commonArgs)
  console.log(`> deployed votingEscrow`)

  const gaugeController = await deployMockKaglaGaugeController(commonArgs)
  console.log(`> deployed gaugeController`)

  const feeDistributor = await deployMockKaglaFeeDistributor({
    tokenAddress: threeKglTokenAddress,
    ...commonArgs,
  })
  console.log(`> deployed feeDistributor`)

  const gauge = await deployMockKaglaGauge({
    threeKglTokenAddress: threeKglTokenAddress,
    ...commonArgs,
  })
  const registry = await deployMockKaglaRegistry({
    pool: threeKglTokenAddress, // temporary
    gauge: gauge.address,
    lpToken: threeKglTokenAddress,
    ...commonArgs,
  })
  console.log(`> deployed registry`)

  const addressProvider = await deployMockKaglaAddressProvider({
    registryAddress: registry.address,
    feeDistributorAddress: feeDistributor.address,
    ...commonArgs,
  })
  console.log(`> deployed addressProvider`)

  console.log(`--- finished deployments ---`)

  const deployedInfos = [
    { key: 'votingEscrow', contract: votingEscrow },
    { key: 'gaugeController', contract: gaugeController },
    { key: 'liquidityGauge', contract: gauge },
    { key: 'minter', contract: { address: ethers.constants.AddressZero } }, // no deployed mock
    { key: 'feeDistributor', contract: feeDistributor },
    { key: 'registry', contract: registry },
    { key: 'addressProvider', contract: addressProvider },
  ]
  for (let info of deployedInfos) {
    writeContractAddress(GROUP, info.key, info.contract.address, filePath)
  }
  console.log(`> addresses in ${filePath}`)
  console.log(readContractAddresses(filePath))
  console.log(`--- FINISHED ---`)
  callback()
}
