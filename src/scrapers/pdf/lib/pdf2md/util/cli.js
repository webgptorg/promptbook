const fs = require('fs')

function getFileAndFolderPaths (folderPath) {
  var filePaths = []
  var folderPaths = []
  var directoryItems = fs.readdirSync(folderPath)
  directoryItems.forEach(directoryItem => {
    const isDirectory = fs.lstatSync(folderPath + '/' + directoryItem).isDirectory()
    if (isDirectory) {
      folderPaths.push(folderPath + '/' + directoryItem)
    }
    const fileExtension = directoryItem
      .split('.')
      .pop()
      .toLowerCase()
    if (fileExtension === 'pdf') {
      filePaths.push(folderPath + '/' + directoryItem)
    }
  })
  return [filePaths, folderPaths]
}

function getAllFileAndFolderPaths (filePaths, folderPaths, recursive) {
  var allFolderPaths = folderPaths
  if (recursive) {
    while (allFolderPaths.length !== 0) {
      var nextFolderPaths = []
      allFolderPaths.forEach(folderPath => {
        const outputArray = getFileAndFolderPaths(folderPath)
        filePaths = filePaths.concat(outputArray[0])
        nextFolderPaths = nextFolderPaths.concat(outputArray[1])
        folderPaths = folderPaths.concat(outputArray[1])
      })
      allFolderPaths = nextFolderPaths
    }
  }
  return [filePaths, folderPaths]
}

module.exports = {
  getFileAndFolderPaths,
  getAllFileAndFolderPaths,
}
