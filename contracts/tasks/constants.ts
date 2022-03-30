import jsonfile from 'jsonfile'
import { TaskUtils } from './utils'
const { vested } = jsonfile.readFileSync('../migrations/distro.json')

type ConstantsType = {
  tokens: {
    KGL: string
    '3Kgl': string
    DAI: string
    WETH: string
  }
  kaglas: {
    votingEscrow: string
    gauge: string
    feeDistributor: string
    registry: string
    addressProvider: string
  }
  contracts: {
    treasury: {
      address: string
    }
    muKglRewards: {
      uid: number
    }
    vestedEscrow: {
      period: number
    }
    merkleAirdrop: {
      merkleRoot: string
    }
  }
  vested: {
    // ref: distro.json
    addresses: string[] // include team, invester, treasury
    amounts: string[] // include team, invester, treasury
  }
}

const local: ConstantsType = {
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
      address: '0xCdfc500F7f0FCe1278aECb0340b523cD55b3EBbb',
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
  vested: {
    addresses: vested.team.addresses.concat(
      vested.investor.addresses,
      vested.treasury.addresses,
    ),
    amounts: vested.team.amounts.concat(
      vested.investor.amounts,
      vested.treasury.amounts,
    ),
  },
}

const constantsMap: { [key in string]: ConstantsType } = {
  hardhat: local,
  localhost: local,
  // kovan: undefined,
  // rinkeby: undefined,
  // astar: undefined,
  // shiden: undefined,
  // shibuya: undefined,
}

export const loadConstants = ({
  network,
  isUseMocks,
}: {
  network: string
  isUseMocks?: boolean
}): ConstantsType => {
  const constants = constantsMap[network]
  if (isUseMocks) {
    const mocks = TaskUtils.loadDeployedMockAddresses({ network: network })
    return {
      ...constants,
      tokens: mocks.tokenMocks as ConstantsType['tokens'],
      kaglas: mocks.kaglaMocks as ConstantsType['kaglas'],
    }
  } else {
    return constants
  }
}
