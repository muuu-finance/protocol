import jsonfile from 'jsonfile'
import { TaskUtils } from '../utils'
import { local } from './local'
import { ConstantsType } from './types'
const { vested } = jsonfile.readFileSync('./migrations/distro.json')

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
