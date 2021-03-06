const { assert } = require('chai')
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants')

contract('KaglaVoterProxy', async (accounts) => {
  const setup = async () => {
    const VotingEscrow = artifacts.require('MockKaglaVoteEscrow')
    const KaglaVoterProxy = artifacts.require('KaglaVoterProxy')
    const votingEscrow = await VotingEscrow.new()
    const kaglaVoterProxy = await KaglaVoterProxy.new(votingEscrow.address)

    return {
      votingEscrow,
      kaglaVoterProxy,
    }
  }

  it('constructor & initial parameters', async () => {
    const { votingEscrow, kaglaVoterProxy: instance } = await setup()
    assert.equal(
      await instance.operator(),
      ZERO_ADDRESS,
      'Fail to check .operator',
    )
    assert.equal(
      await instance.depositor(),
      ZERO_ADDRESS,
      'Fail to check .depositor',
    )
    assert.equal(
      await instance.votingEscrow(),
      votingEscrow.address,
      'Fail to check .votingEscrow',
    )
    assert.equal(
      await instance.mintr(),
      '0xd061D61a4d941c39E5453435B6345Dc261C2fcE0',
      'Fail to check .mintr',
    )
    assert.equal(
      await instance.kgl(),
      '0xD533a949740bb3306d119CC777fa900bA034cd52',
      'Fail to check .kgl',
    )
    assert.equal(
      await instance.gaugeController(),
      '0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB',
      'Fail to check .gaugeController',
    )
  })

  it('#getName', async () => {
    const { kaglaVoterProxy: instance } = await setup()
    assert.equal(await instance.getName(), 'KaglaVoterProxy')
  })

  it.skip('#deposit')
  it.skip('#withdraw')
  it.skip('#createLock')
  it.skip('#increaseAmount')
  it.skip('#increaseAmount')
})
