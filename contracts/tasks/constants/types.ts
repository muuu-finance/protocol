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
    minter: string
    feeDistributor: string // for test / mock
    registry: string // for test / mock
    addressProvider: string
  }
  pools?: {
    name: string
    swap: string
    gauge: string
  }[]
  contracts: {
    treasury: {
      address: string // TreasuryFunds
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
  adminAddress: string | null,
  premine: string,
}
