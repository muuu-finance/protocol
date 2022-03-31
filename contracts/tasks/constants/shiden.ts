import { ethers } from 'ethers'
import { ConstantsType } from './types'

export const shiden: ConstantsType = {
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
    gauge: '',
    feeDistributor: '',
    registry: '',
    addressProvider: '',
  },
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
      ethers.utils.parseEther("100000.0").toString(),
      ethers.utils.parseEther("50000.0").toString(),
      ethers.utils.parseEther("30000.0").toString(),
      ethers.utils.parseEther("15000.0").toString(),
      ethers.utils.parseEther("5000.0").toString(),
    ],
  },
}