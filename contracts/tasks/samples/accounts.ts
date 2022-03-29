import { HardhatRuntimeEnvironment } from "hardhat/types"

import { task } from 'hardhat/config'
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"

task('accounts', 'Prints the list of accounts').setAction(async ({}, hre: HardhatRuntimeEnvironment) => {
  const accounts: SignerWithAddress[]  = await hre.ethers.getSigners()
  for (const account of accounts) {
    console.log(`------------------------------------------`)
    console.log(`account ... ${await account.address}`)
    console.log(`balance ... ${await account.getBalance()}`)
  }
})
