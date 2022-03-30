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
    const fileName = this.getFilePath({ network: network })
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
    const filePath = this.getFilePath({ network: network })
    return jsonfile.readFileSync(filePath) as DeployedContractAddresses
  }

  static loadDeployedMockAddresses = (
    network: string,
  ): DeployedMockAddresses => {
    const filePath = this.getMockFilePath(network)
    return jsonfile.readFileSync(filePath) as DeployedMockAddresses
  }

  static #updateJson = (
    group: string,
    name: string | null,
    value: string,
    obj: any,
  ) => {
    if (obj[group] === undefined) obj[group] = {}
    if (name === null) {
      obj[group] = value
    } else {
      if (obj[group][name] === undefined) obj[group][name] = {}
      obj[group][name] = value
    }
  }

  static writeContractAddress = (
    group: string,
    name: string | null,
    value: string,
    fileName: string,
  ) => {
    try {
      const base = jsonfile.readFileSync(fileName)
      this.#updateJson(group, name, value, base)
      const output = JSON.stringify(base, null, 2)
      fs.writeFileSync(fileName, output)
    } catch (e) {
      console.log(e)
    }
  }

  static writeValueToGroup = (group: string, value: any, fileName: string) => {
    try {
      const base = jsonfile.readFileSync(fileName)
      this.#updateJson(group, null, value, base)
      const output = JSON.stringify(base, null, 2)
      fs.writeFileSync(fileName, output)
    } catch (e) {
      console.log(e)
    }
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
  KglDepositor: 'KglDepositor',
  BaseRewardPool: 'BaseRewardPool',
  MuuuRewardPool: 'MuuuRewardPool',
  PoolManager: 'PoolManager',
  ArbitratorVault: 'ArbitratorVault',
  MuuuLockerV2: 'MuuuLockerV2',
  ClaimZap: 'ClaimZap',
  VestedEscrow: 'VestedEscrow',
  MerkleAirdropFactory: 'MerkleAirdropFactory',
  MerkleAirdrop: 'MerkleAirdrop',
}
