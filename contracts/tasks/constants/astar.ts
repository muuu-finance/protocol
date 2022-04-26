import { ethers } from 'ethers'
import { ConstantsType } from './types'

export const astar: ConstantsType = {
  tokens: {
    KGL: '0x257f1a047948f73158DaDd03eB84b34498bCDc60',
    '3Kgl': '', // not used
    DAI: '', // not used
    WETH: '', // not used
  },
  kaglas: {
    votingEscrow: '0x432c8199F548425F7d5746416D98126E521e8174',
    gaugeController: '0x1f857fB3bCb72F03cB210f62602fD45eE1caeBdf',
    liquidityGauge: '', // not used
    minter: "0x210c5BE93182d02A666392996f62244001e6E04d",
    feeDistributor: '', // not used
    registry: '', // not used
    addressProvider: '0x5a0ad8337E5C6895b3893E80c8333859DAcf7c01',
  },
  pools: [
    {
      name: "3Pool", // (3KGL) lptoken = 0x18BDb86E835E9952cFaA844EB923E470E832Ad58
      gauge: "0xa480B71b5aFBe28df9658C253e1E18A5EeDA131E",
    },
    {
      name: "Starlay 3Pool", // (l3KGL) lptoken = 0x60811F3d54e860cDf01D72ED422a700e9cf010a9
      gauge: "0x13EE6d778B41229a8dF6a2c6EB2dcf595faFc2f4",
    },
    {
      name: "BUSD+3KGL", // (BUSD3KGL) lptoken = 0x11baa439EFf75B80a72b889e171d6E95FB39ee11
      gauge: "0x940f388bb2f33C81840b70cDd72b3bC73d76232E",
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
      period: 1 * 364 * 86400, // TODO
    },
    merkleAirdrop: {
      merkleRoot:
        '0x632a2ad201c5b95d3f75c1332afdcf489d4e6b4b7480cf878d8eba2aa87d5f73', // TODO
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