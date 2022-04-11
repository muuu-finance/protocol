import { ethers } from 'ethers'
import { ConstantsType } from './types'

export const shiden: ConstantsType = {
  tokens: {
    KGL: '0x039F7Ef55595923C78c2c3bBa41625eBa6F667b9',
    '3Kgl': '',
    DAI: '',
    WETH: '',
  },
  kaglas: {
    votingEscrow: '0xDFe3C797977a0B40C90E7c2869407327a4208654',
    gauge: '0xBEDcfA1EB6cf39dd829207147692C0eaeCe32065',
    minter: "0x5dE0CF708F7753F176F1d23229c0EE50a23872f7",
    feeDistributor: '',
    registry: '',
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
      address: '0x175d905470e85279899C37F89000b195f3d0c0C5', // dummy
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
  vested: { // dummy
    addresses: [
      "0x6543076E4315bd82129105890Bc49c18f496a528",
      "0xb5Bb46b67529f934b33f1CB610C84d574c9d7658",
      "0x5750fA3Aa4Af7F8a0cD094D0FfC4FBEF0E1CE208",
      "0x50414Ac6431279824df9968855181474c919a94B",
      "0xE5b0710729AC8126C48afff9AB857DCC09886fEc"
    ],
    amounts: [
      ethers.utils.parseEther("1000000.0").toString(),
      ethers.utils.parseEther("500000.0").toString(),
      ethers.utils.parseEther("300000.0").toString(),
      ethers.utils.parseEther("150000.0").toString(),
      ethers.utils.parseEther("50000.0").toString(),
    ],
  },
}