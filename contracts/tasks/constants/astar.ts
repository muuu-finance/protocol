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
    minter: '0x210c5BE93182d02A666392996f62244001e6E04d',
    feeDistributor: '', // not used
    registry: '', // not used
    addressProvider: '0x5a0ad8337E5C6895b3893E80c8333859DAcf7c01',
  },
  pools: [
    {
      name: '3Pool',
      gauge: '0x35327a731cCc30C043e74E2c7385486Ef905Eb08',
    },
    {
      name: 'Starlay 3Pool',
      gauge: '0x6b822dE272355524D92Ab70310035e4c573044bE',
    },
    {
      name: 'BUSD+3KGL',
      gauge: '0x5A2497F1C79C7a9a28224A0dBfc8e6f4EA412074',
    },
    {
      name: 'BAI+3KGL',
      gauge: '0x9C8B44d5179502e651D95597ac3E9308B2e2f6C0',
    },
    {
      name: 'oUSD+3KGL',
      gauge: '0xbF98a30a9B385b225e9a3FD327FE8C4EDE2d6655',
    },
    {
      name: 'aUSD+3KGL',
      gauge: '0xe6bA40C9686a05a2841829f98b5dF9cd6E3300A9',
    },
    {
      name: 'ASTR/nASTR',
      gauge: '0xEC1BD689f7576E912348D50aE3F10F4cA5489384',
    },
    {
      name: 'KGL/muKGL',
      gauge: '0x4d69485D5E45f83A1A7DA1bd425eA1bE7c3E1106',
    },
    {
      name: 'aBaiUsdc+3KGL',
      gauge: '0x7c46CB85DA894b783B4D0D001901b39078d27697',
    },
    {
      name: 'aDaiUsdc+3KGL',
      gauge: '0x361B92d1bBa86F38F18d3298A9223a33b02C9e6a',
    },
    {
      name: 'aBusdUsdc+3KGL',
      gauge: '0xaBa6623E3ae5fBD447c3e1f941D658C88de604c8',
    },
    {
      name: 'aUsdtUsdc+3KGL',
      gauge: '0x5a1DA44b525c7a45Dd6BF84822Dd8CF1cC7309c5',
    },
    {
      name: 'LAY/muLAY',
      gauge: '0x8af463423696cd485e138d78b261cA95EbCB7F44',
    },
    {
      name: 'USDT+3KGL',
      gauge: '0xF04285C92B120B327d2318cAcafe5cb1F4D9DB0F',
    },
  ],
  contracts: {
    treasury: {
      address: '0xC8c84Db782a926aA61D3B131B58c0CCb2c3576d5', // set TreasuryFunds address after deployed
      operator: '', // if possible, set TreasuryFunds's operator before deployed
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
