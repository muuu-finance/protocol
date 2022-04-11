export type DeployedContractAddresses = {
  system: {
    [key in string]: string
  }
  pools: {
    lptoken: string
    token: string
    gauge: string
    kglRewards: string
    stash: string
    rewards: { [key in string]: string }[]
    name: string
    id: number
  }[]
}

export type DeployedMockAddresses = {
  tokenMocks: {
    [key in string]: string
  }
  kaglaMocks: {
    [key in string]: string
  }
}
