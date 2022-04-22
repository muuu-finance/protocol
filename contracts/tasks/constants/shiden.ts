import { ethers } from 'ethers'
import { ConstantsType } from './types'

export const shiden: ConstantsType = {
  tokens: {
    KGL: '0x039F7Ef55595923C78c2c3bBa41625eBa6F667b9',
    '3Kgl': '', // only use when using mock
    DAI: '', // only use when using mock
    WETH: '', // only use when using mock
  },
  kaglas: {
    votingEscrow: '0xDFe3C797977a0B40C90E7c2869407327a4208654',
    gaugeController: '0xBEDcfA1EB6cf39dd829207147692C0eaeCe32065',
    liquidityGauge: '', // only use when using mock
    minter: "0x5dE0CF708F7753F176F1d23229c0EE50a23872f7",
    feeDistributor: '', // only use when using mock
    registry: '', // only use when using mock
    addressProvider: '0x762b149eA23070d6F021F70CB8877d2248278855',
  },
  pools: [
    {
      name: "3Pool", // (3KGL) lptoken = 0x99799cAB58C5591ee10015F12173C1104eB23225
      swap: "0x8DEEF31ca7fE831527E46D4C736B147628564f7C",
      gauge: "0xe616CD383Af18aEde6024e9BFB54B9Cd1D7aC385",
    },
    {
      name: "Starlay 3Pool", // (l3KGL) lptoken = 0x3328E82bB102809e91A072851a5BcBa86215E5E4
      swap: "0xe144E1849e1C005D188f9fA11d4A484D29547F39",
      gauge: "0xd5e4DEcE9fC2328f0658717682A9b703b496F073",
    },
    {
      name: "BUSD+3KGL", // (BUSD3KGL) lptoken = 0xaA85Ebb591077e11246422ea941c503b473b5299
      swap: "0xfbFf009e75d81e037BFA7dd81E5aBdaC585426dF",
      gauge: "0xcBeD93bB370376e4EA7D08d3d4FDEdDc5A84b1ed",
    }
  ],
  contracts: {
    treasury: {
      address: '0xCdfc500F7f0FCe1278aECb0340b523cD55b3EBbb', // set TreasuryFunds address after deployed
      operator: '' // if possible, set TreasuryFunds's operator before deployed

    },
    muKglRewards: {
      uid: 0,
    },
    vestedEscrow: {
      period: 1 * 364 * 86400,
    },
    merkleAirdrop: {
      merkleRoot:
        '0x632a2ad201c5b95d3f75c1332afdcf489d4e6b4b7480cf878d8eba2aa87d5f73', // dummy
    },
  },
  adminAddress: null,
  premine: {
    total: ethers.utils.parseEther((50 * 1_000_000).toString()).toString(),
    holders: {
      deployer: ethers.utils.parseEther((40 * 1_000_000).toString()).toString(),
      treasury: ethers.utils.parseEther((10 * 1_000_000).toString()).toString(),
    }
  }
}