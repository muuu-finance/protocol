import { ethers } from 'ethers'
import { ConstantsType } from './types'

export const shiden: ConstantsType = {
  tokens: {
    KGL: '0x5aA6012602d722C29FeD77cFa1A7C0717E92F3E0',
    '3Kgl': '', // only use when using mock
    DAI: '', // only use when using mock
    WETH: '', // only use when using mock
  },
  kaglas: {
    votingEscrow: '',
    gaugeController: '0xfe372d95BDFE7313435D539c87E68029A792997e',
    liquidityGauge: '', // only use when using mock
    minter: "0xa6358181b2753DAC5d2Ade97519E7c1A766d9c87",
    feeDistributor: '', // only use when using mock
    registry: '', // only use when using mock
    addressProvider: '',
  },
  pools: [
    {
      name: "3Pool", // (3KGL) lptoken = 0x99799cAB58C5591ee10015F12173C1104eB23225
      gauge: "0xe806e841ca26fF5A82E58A7A9144B7032623E4FB",
    },
    {
      name: "Starlay 3Pool", // (l3KGL) lptoken = 0x3328E82bB102809e91A072851a5BcBa86215E5E4
      gauge: "0xc020e5D53Af59b0Fd22970f9851AcB1a12A317c6",
    },
    {
      name: "BUSD+3KGL", // (BUSD3KGL) lptoken = 0xaA85Ebb591077e11246422ea941c503b473b5299
      gauge: "0x02871ff0b539E04A952e1d6cB4ae2f6eBCE7f3eD",
    }
  ],
  contracts: {
    treasury: {
      address: '', // set TreasuryFunds address after deployed
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
        '', // dummy
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