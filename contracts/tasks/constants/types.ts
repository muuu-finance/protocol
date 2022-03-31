export type ConstantsType = {
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