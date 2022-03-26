const fs = require('fs')
const jsonfile = require('jsonfile')
const DEFAULT_FILE_NAME = './contracts.json'

const readContractAddresses = (fileName = DEFAULT_FILE_NAME) =>
  jsonfile.readFileSync(fileName)

const _updateJson = (group, name, value, obj) => {
  if (obj[group] === undefined) obj[group] = {}
  if (name === null) {
    obj[group] = value
  } else {
    if (obj[group][name] === undefined) obj[group][name] = {}
    obj[group][name] = value
  }
}

const writeContractAddress = (group, name, value, fileName) => {
  try {
    const base = jsonfile.readFileSync(fileName)
    _updateJson(group, name, value, base)
    const output = JSON.stringify(base, null, 2)
    fs.writeFileSync(fileName, output, (err) => {
      if (err) {
        return console.log('Error writing file: ' + err)
      }
    })
  } catch (e) {
    console.log(e)
  }
}

const writeValueToGroup = (group, value, fileName) => {
  try {
    const base = jsonfile.readFileSync(fileName)
    _updateJson(group, null, value, base)
    const output = JSON.stringify(base, null, 2)
    fs.writeFileSync(fileName, output, (err) => {
      if (err) {
        return console.log('Error writing file: ' + err)
      }
    })
  } catch (e) {
    console.log(e)
  }
}

module.exports = {
  readContractAddresses: readContractAddresses,
  writeContractAddress: writeContractAddress,
  writeValueToGroup: writeValueToGroup,
}
