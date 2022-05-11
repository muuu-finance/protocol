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
      name: "3Pool",
      gauge: "0x6A892edcFfafe4F64896419b1b57965e8e5bb68e",
    },
    {
      name: "Starlay 3Pool",
      gauge: "0x1571943e281f8C579Fcf63cBD31E425c0bFDdc74",
    },
    {
      name: "BUSD+3KGL",
      gauge: "0xdF180f31739284a1A8Ba3a110cDdaD58642F3DAF",
    },
    {
      name: "BAI+3KGL",
      gauge: "0x9D2070D930005553D2994A202BB17C80053A4e00",
    },
    {
      name: "oUSD+3KGL",
      gauge: "0xA52f1d4362f4fF6A976c379C8d450AA7EB20aff4",
    },
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
      deployer: ethers.utils.parseEther((37 * 1_000_000).toString()).toString(),
      treasury: ethers.utils.parseEther((13 * 1_000_000).toString()).toString(),
    },
  },
}
