import { ConstantsType } from './types'

export const astar: ConstantsType = {
  tokens: {
    KGL: '0x039F7Ef55595923C78c2c3bBa41625eBa6F667b9',
    '3Kgl': '', // not used
    DAI: '', // not used
    WETH: '', // not used
  },
  kaglas: {
    votingEscrow: '0xDFe3C797977a0B40C90E7c2869407327a4208654',
    gauge: '0xBEDcfA1EB6cf39dd829207147692C0eaeCe32065',
    feeDistributor: '', // not used
    registry: '', // not used
    addressProvider: '0x762b149eA23070d6F021F70CB8877d2248278855',
  },
  pools: [
    {
      name: "3Pool", // (3KGL) lptoken = 0x18BDb86E835E9952cFaA844EB923E470E832Ad58
      swap: "0xeB97BC7C4ca99Fa8078fF879905338517821B9F5",
      gauge: "0xa480B71b5aFBe28df9658C253e1E18A5EeDA131E",
    },
    {
      name: "Starlay 3Pool", // (l3KGL) lptoken = 0x60811F3d54e860cDf01D72ED422a700e9cf010a9
      swap: "0xED29Ca5c39E35793F63f4485873ABBB52Cb29308",
      gauge: "0x13EE6d778B41229a8dF6a2c6EB2dcf595faFc2f4",
    },
    {
      name: "BUSD+3KGL", // (BUSD3KGL) lptoken = 0x11baa439EFf75B80a72b889e171d6E95FB39ee11
      swap: "0x247f10E06536dD774f11FA5F8309C21b6647FC9a",
      gauge: "0x940f388bb2f33C81840b70cDd72b3bC73d76232E",
    }
  ],
  contracts: {
    treasury: {
      address: '', // TODO
    },
    muKglRewards: {
      uid: 0,
    },
    vestedEscrow: {
      period: 1 * 364 * 86400, // TODO
    },
    merkleAirdrop: {
      merkleRoot:
        '0x632a2ad201c5b95d3f75c1332afdcf489d4e6b4b7480cf878d8eba2aa87d5f73', // TODO
    },
  },
  vested: { // TODO
    addresses: [],
    amounts: [],
  },
}