
const fs = require('fs-extra')
const {join, parse} = require('path')

function Directory(path, map) {
  
}

Directory.load = async function(path, options) {
  let children
  try {
    children = await fs.readdir(path)
  } catch (err) { throw `Failed to enumerate files in directory '${parse(path).name}' due to ${err}` }

  let map = {}
  let dirFile = options.dirfile || options.extension || '.conf'

  if (children.indexOf(dirFile) >= 0) {
    children.splice(children.indexOf(dirFile), 1)
    map = await load(path, options)
  }

  if (options.filter) {
    let pattern = options.filter instanceof RegExp ? options.filter : new RegExp(options.filter)
    children = children.filter(child => {
      let match = pattern.exec(child)
      return match !== null && match.index === 0 && match[0].length === child.length
    })
  }

  if (options.extension) children = children.filter(child => child.endsWith(options.extension))

  for (let child of children)
    map[child] = await load(join(path, child), options)

  return new Directory(path, map)
}

function File(path, writable, map) {

}

File.load = async function(path, options) {
  try {
    await fs.access(path, fs.constants.R_OK)
  } catch (err) { throw `'${parse(path).name}' could not be read due to ${err}` }

  if (options.writable) {
    try {
      await fs.access(path, fs.constants.W_OK)
    } catch (err) { throw `'${parse(path).name}' is not writable` }
  }

  let data
  try {
    data = await fs.readFile(path, {encoding: options.encoding})
  } catch (err) { throw `Failed to read '${parse(path).name}' due to ${err}` }

  return new File(path, options.writable, options.format.parse(data))
}

async function load(path, options) {
  try {
    await fs.access(path, fs.constants.R_OK)
  } catch (err) { throw `'${name}' could not be read due to ${err}` }

  let stat
  try {
    stat = await fs.lstat(path)
  } catch (err) { throw `Failed to get info for '${name}' due to ${err}` }

  return stat.isDirectory()
    ? await Directory.load(path, options)
    : await File.load(path, options)
}