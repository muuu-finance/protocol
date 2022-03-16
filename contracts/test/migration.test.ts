const MigrationsContract = artifacts.require('Migrations')

contract('Migrations', () => {
  it('has been deployed successfully', async () => {
    const migrations = await MigrationsContract.deployed()
    assert(migrations, 'contracut was not deployed')
  })
})
