export type ConstantsType = {
  tokens: {
    KGL: string
    '3Kgl': string
    DAI: string // for test / mock
    WETH: string // for test / mock
  }
  kaglas: {
    votingEscrow: string
    gaugeController: string
    liquidityGauge: string // for test / mock (for dummy 3kgl gauge)
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
    treasury: { // TreasuryFunds
      address: string
      operator?: string
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
  premine: {
    total: string,
    holders: {
      deployer: string,
      treasury: string,
    }
  },
}
