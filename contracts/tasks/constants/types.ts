export type ConstantsType = {
  tokens: {
    KGL: string
    '3Kgl': string
    DAI: string // for test / mock
    WETH: string // for test / mock
  }
  kaglas: {
    votingEscrow: string
    gauge: string
    feeDistributor: string // for test / mock
    registry: string // for test / mock
    addressProvider: string
  }
  pools?: {
    name: string
    lpToken: string
    gauge: string
  }[]
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