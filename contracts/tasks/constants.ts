import { ethers } from 'ethers'
import { TaskUtils } from './utils'

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
  }
}

const local: ConstantsType = {
  tokens: {
    // need overrides by loading json
    KGL: ethers.constants.AddressZero,
    '3Kgl': ethers.constants.AddressZero,
    DAI: ethers.constants.AddressZero,
    WETH: ethers.constants.AddressZero,
  },
  kaglas: {
    // need overrides by loading json
    votingEscrow: ethers.constants.AddressZero,
    gauge: ethers.constants.AddressZero,
    feeDistributor: ethers.constants.AddressZero,
    registry: ethers.constants.AddressZero,
    addressProvider: ethers.constants.AddressZero,
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
