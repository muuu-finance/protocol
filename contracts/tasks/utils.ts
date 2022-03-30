import fs from 'fs'
import jsonfile from 'jsonfile'
import { DeployedContractAddresses, DeployedMockAddresses } from './types'

const BASE_PATH = '.'
const BASE_NAME = 'contracts'
const EXTENSTION = 'json'

export class TaskUtils {
  static getFilePath = ({
    network,
    basePath,
    suffix,
  }: {
    network: string
    basePath?: string
    suffix?: string
  }): string => {
    const _basePath = basePath ? basePath : BASE_PATH
    const commonFilePath = `${_basePath}/${BASE_NAME}-${network}`
    return suffix
      ? `${commonFilePath}-${suffix}.${EXTENSTION}`
      : `${commonFilePath}.${EXTENSTION}`
  }

  static getMockFilePath = (network: string): string =>
    `./contract-mocks-${network}.json`

  static resetContractAddressesJson = (network: string): void => {
    const fileName = TaskUtils.getFilePath({ network: network })
    if (fs.existsSync(fileName)) {
      const folderName = 'tmp'
      fs.mkdirSync(folderName, { recursive: true })
      // get current datetime in this timezone
      const date = new Date()
      date.setTime(date.getTime() + 9 * 60 * 60 * 1000)
      const strDate = date
        .toISOString()
        .replace(/(-|T|:)/g, '')
        .substring(0, 14)
      // rename current file
      fs.renameSync(
        fileName,
        TaskUtils.getFilePath({
          network: network,
          basePath: `./tmp`,
          suffix: strDate,
        }),
      )
    }
    fs.writeFileSync(fileName, JSON.stringify({}, null, 2))
  }

  static loadDeployedContractAddresses = (
    network: string,
  ): DeployedContractAddresses => {
    const filePath = TaskUtils.getFilePath({ network: network })
    return jsonfile.readFileSync(filePath) as DeployedContractAddresses
  }

  static loadDeployedMockAddresses = (
    network: string,
  ): DeployedMockAddresses => {
    const filePath = TaskUtils.getMockFilePath(network)
    return jsonfile.readFileSync(filePath) as DeployedMockAddresses
  }
}

export const ContractKeys = {
  KaglaVoterProxy: 'KaglaVoterProxy',
  MuuuToken: 'MuuuToken',
  Booster: 'Booster',
  RewardFactory: 'RewardFactory',
  TokenFactory: 'TokenFactory',
  StashFactory: 'StashFactory',
  MuKglToken: 'MuKglToken',
}
