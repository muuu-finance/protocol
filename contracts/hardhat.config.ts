import fs from "fs"
import path from "path"
import { BigNumber, ethers } from "ethers"
import '@nomiclabs/hardhat-ethers'
import { HardhatUserConfig, NetworkUserConfig } from "hardhat/types"
const {
  MNEMONIC,
  getAstarNetworkUrl,
  getEthereumNetworkUrl
} = require("./utils/config_utils")

// load tasks
const taskPaths = ['deploys', 'samples']
taskPaths.forEach((folder) => {
  const tasksPath = path.join(__dirname, 'tasks', folder)
  fs.readdirSync(tasksPath)
    .filter((_path) => _path.includes(".ts"))
    .forEach((task) => {
      require(`${tasksPath}/${task}`)
    })
})

// define accounts for local
const testAccounts: { secretKey: string, balance: BigNumber }[] = [
  {
    secretKey: '0xc5e8f61d1ab959b397eecc0a37a6517b8e67a0e7cf1f4bce5591f3ed80199122',
    balance: ethers.utils.parseEther("500.0"),
  },
  {
    secretKey: '0xd49743deccbccc5dc7baa8e69e5be03298da8688a15dd202e20f15d5e0e9a9fb',
    balance: ethers.utils.parseEther("500.0"),
  },
  {
    secretKey: '0x23c601ae397441f3ef6f1075dcb0031ff17fb079837beadaf3c84d96c6f3e569',
    balance: ethers.utils.parseEther("500.0"),
  },
  {
    secretKey: '0xee9d129c1997549ee09c0757af5939b2483d80ad649a0eda68e8b0357ad11131',
    balance: ethers.utils.parseEther("500.0"),
  },
  {
    secretKey: '0x87630b2d1de0fbd5044eb6891b3d9d98c34c8d310c852f98550ba774480e47cc',
    balance: ethers.utils.parseEther("500.0"),
  },
  {
    secretKey: '0x275cc4a2bfd4f612625204a20a2280ab53a6da2d14860c47a9f5affe58ad86d4',
    balance: ethers.utils.parseEther("500.0"),
  },
  {
    secretKey: '0xaee25d55ce586148a853ca83fdfacaf7bc42d5762c6e7187e6f8e822d8e6a650',
    balance: ethers.utils.parseEther("500.0"),
  },
  {
    secretKey: '0xa2e0097c961c67ec197b6865d7ecea6caffc68ebeb00e6050368c8f67fc9c588',
    balance: ethers.utils.parseEther("500.0"),
  },
];

const getCommonNetworkConfig = (
  { url, chainId }: { url: string, chainId: number }
): NetworkUserConfig => ({
  url: url,
  chainId: chainId,
  accounts: {
    mnemonic: MNEMONIC,
    path: "m/44'/60'/0'/0",
    initialIndex: 0,
    count: 20,
  }
})

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
const config: HardhatUserConfig = {
  solidity: {
    version: '0.6.12',
    settings: {
      optimizer: { enabled: true, runs: 200 }
    }
  },
  defaultNetwork: "hardhat",
  networks: {
    localhost: {
      url: 'http://127.0.0.1:8545'
    },
    hardhat: {
      throwOnTransactionFailures: true,
      throwOnCallFailures: true,
      allowUnlimitedContractSize: true,
      accounts: testAccounts.map(v => ({
        privateKey: v.secretKey,
        balance: v.balance.toString()
      }))
    },
    rinkeby: getCommonNetworkConfig({
      url: getEthereumNetworkUrl('rinkeby'),
      chainId: 4
    }),
    kovan: getCommonNetworkConfig({
      url: getEthereumNetworkUrl('kovan'),
      chainId: 42
    }),
    astar: getCommonNetworkConfig({
      url: getAstarNetworkUrl('astar'),
      chainId: 592
    }),
    shiden: getCommonNetworkConfig({
      url: getAstarNetworkUrl('shiden'),
      chainId: 336
    }),
    shibuya: getCommonNetworkConfig({
      url: getAstarNetworkUrl('shibuya'),
      chainId: 81
    }),
  }
}

export default config
