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

  static getMockFilePath = ({ network }: { network: string }): string =>
    `./contract-mocks-${network}.json`

  static resetContractAddressesJson = ({
    network,
  }: {
    network: string
  }): void => {
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

  static loadDeployedContractAddresses = ({
    network,
  }: {
    network: string
  }): DeployedContractAddresses => {
    const filePath = this.getFilePath({ network: network })
    return jsonfile.readFileSync(filePath) as DeployedContractAddresses
  }

  static loadDeployedMockAddresses = ({
    network,
  }: {
    network: string
  }): DeployedMockAddresses => {
    const filePath = this.getMockFilePath({ network: network })
    return jsonfile.readFileSync(filePath) as DeployedMockAddresses
  }

  static #updateJson = ({
    group,
    name,
    value,
    obj,
  }: {
    group: string
    name: string | null
    value: any
    obj: any
  }) => {
    if (obj[group] === undefined) obj[group] = {}
    if (name === null) {
      obj[group] = value
    } else {
      if (obj[group][name] === undefined) obj[group][name] = {}
      obj[group][name] = value
    }
  }

  static writeContractAddress = ({
    group,
    name,
    value,
    fileName,
  }: {
    group: string
    name: string | null
    value: string
    fileName: string
  }) => {
    try {
      const base = jsonfile.readFileSync(fileName)
      this.#updateJson({
        group: group,
        name: name,
        value: value,
        obj: base,
      })
      const output = JSON.stringify(base, null, 2)
      fs.writeFileSync(fileName, output)
    } catch (e) {
      console.log(e)
    }
  }

  static writeValueToGroup = (group: string, value: any, fileName: string) => {
    try {
      const base = jsonfile.readFileSync(fileName)
      this.#updateJson({ group: group, name: null, value: value, obj: base })
      const output = JSON.stringify(base, null, 2)
      fs.writeFileSync(fileName, output)
    } catch (e) {
      console.log(e)
    }
  }
}

export const ContractJsonGroups = {
  system: 'system',
  pools: 'pools',
}

export const ContractKeys = {
  TreasuryFunds: 'TreasuryFunds',
  KaglaVoterProxy: 'KaglaVoterProxy',
  MuuuToken: 'MuuuToken',
  Booster: 'Booster',
  BoosterOwner: 'BoosterOwner',
  RewardFactory: 'RewardFactory',
  TokenFactory: 'TokenFactory',
  StashFactoryV2: 'StashFactoryV2',
  StashFactoryV2Rev2: 'StashFactoryV2Rev2',
  ProxyFactory: 'ProxyFactory',
  ExtraRewardStashV3: 'ExtraRewardStashV3',
  ExtraRewardStashV3Rev2: 'ExtraRewardStashV3Rev2',
  MuKglToken: 'MuKglToken',
  KglDepositor: 'KglDepositor',
  BaseRewardPool: 'BaseRewardPool',
  MuuuRewardPool: 'MuuuRewardPool',
  PoolManagerProxy: 'PoolManagerProxy',
  PoolManagerSecondaryProxy: 'PoolManagerSecondaryProxy',
  PoolManagerV3: 'PoolManagerV3',
  ArbitratorVault: 'ArbitratorVault',
  MuuuLockerV2: 'MuuuLockerV2',
  MuuuStakingProxyV2: 'MuuuStakingProxyV2',
  ClaimZap: 'ClaimZap',
  VestedEscrow: 'VestedEscrow',
  MerkleAirdropFactory: 'MerkleAirdropFactory',
  MerkleAirdrop: 'MerkleAirdrop',
}
