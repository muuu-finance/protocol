import { ethers } from 'ethers'
import { ConstantsType } from './types'

export const shiden: ConstantsType = {
  tokens: {
    KGL: '0x977b4c31DfFE505B04D09c1CC70F64339E7C1EA4',
    '3Kgl': '', // only use when using mock
    DAI: '', // only use when using mock
    WETH: '', // only use when using mock
  },
  kaglas: {
    votingEscrow: '0x05D034Ba28d5050C80DbECc36d5256575fd42431',
    gaugeController: '0x7a1D9E204b09beC04F9036b409ffF15452974059',
    liquidityGauge: '', // only use when using mock
    minter: '0x0Ac67947735a9642c8d15f3421Af346D3033B5dB',
    feeDistributor: '', // only use when using mock
    registry: '', // only use when using mock
    addressProvider: '0xF86360a930590BaE72E42eFE03eba0aD61EAD6A9',
  },
  pools: [
    {
      name: '3Pool',
      gauge: '0x3F41c725DD5c1a75479Ed9DB1fa8Eac77A6f76E9',
    },
    {
      name: 'Starlay 3Pool',
      gauge: '0x3B1dfc5993aB7BC90e6FBe18221e76CF0318A577',
    },
    {
      name: 'BUSD+3KGL',
      gauge: '0xF05287d053546b3cc767175Db11A40393febcc4f',
    },
    {
      name: 'BAI+3KGL',
      gauge: '0xad8599d608dF5492950150E6F6918196942Ef36D',
    },
    {
      name: 'oUSD+3KGL',
      gauge: '0xF827a7d5fED43dDA71A1f332d58f6bD433C3F75B',
    },
  ],
  contracts: {
    treasury: {
      address: '0xF37b07D66CE2B43fA6FCc156880D4BF3F3e0D249', // set TreasuryFunds address after deployed
      operator: '', // if possible, set TreasuryFunds's operator before deployed
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
      deployer: ethers.utils.parseEther((37 * 1_000_000).toString()).toString(),
      treasury: ethers.utils.parseEther((13 * 1_000_000).toString()).toString(),
    },
  },
}
