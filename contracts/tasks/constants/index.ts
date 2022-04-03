import { TaskUtils } from '../utils'
import { astar } from './astar'
import { local } from './local'
import { shiden } from './shiden'
import { ConstantsType } from './types'

const constantsMap: { [key in string]: ConstantsType } = {
  hardhat: local,
  localhost: local,
  // kovan: undefined,
  // rinkeby: undefined,
  astar: astar,
  shiden: shiden,
  // shibuya: undefined,
}

export const loadConstants = ({
  network,
  isUseMocks,
}: {
  network: string // tNetwork
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
