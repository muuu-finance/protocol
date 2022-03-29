const fs = require('fs')
const path = require('path')
require('@nomiclabs/hardhat-ethers')

// load tasks
const taskPaths = ['samples']
taskPaths.forEach((folder) => {
  const tasksPath = path.join(__dirname, 'tasks', folder)
  fs.readdirSync(tasksPath)
    .filter((pth) => pth.includes('.js'))
    .forEach((task) => {
      require(`${tasksPath}/${task}`)
    })
})

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: '0.6.12',
}
