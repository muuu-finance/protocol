import { ethers } from 'ethers'
import jsonfile from 'jsonfile'
import { ConstantsType } from './types'

export const local: ConstantsType = {
  tokens: {
    // need overrides by loading json
    KGL: '',
    '3Kgl': '',
    DAI: '',
    WETH: '',
  },
  kaglas: {
    // need overrides by loading json
    votingEscrow: '',
    gaugeController: '',
    minter: ethers.constants.AddressZero, // no deployed mock
    feeDistributor: '',
    registry: '',
    addressProvider: '',
  },
  contracts: {
    treasury: {
      address: '0xCdfc500F7f0FCe1278aECb0340b523cD55b3EBbb',
      operator: undefined
    },
    muKglRewards: {
      uid: 0,
    },
    vestedEscrow: {
      period: 1 * 364 * 86400,
    },
    merkleAirdrop: {
      merkleRoot:
        '0x632a2ad201c5b95d3f75c1332afdcf489d4e6b4b7480cf878d8eba2aa87d5f73',
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

// vested: {
//   addresses: vested.team.addresses.concat(
//     vested.investor.addresses,
//     vested.treasury.addresses,
//   ),
//   amounts: vested.team.amounts.concat(
//     vested.investor.amounts,
//     vested.treasury.amounts,
//   ),
// },