
const fs = require('fs-extra')
const {join, parse} = require('path')
const {inherits} = require('util')

module.exports = {
  Directory, File, Map, load
}

function Map(map) {
  this._get = function(path) {
    if (path[0] instanceof Array) {
      for (let option of path[0]) {
        let value = this._get([option, ...path.slice(1)])
        if (value !== undefined) return value
      }
      return undefined
    }
    
    if (!map.hasOwnProperty(path[0])) return undefined
    else if (path.length === 1) return map[path[0]]
    else if (map[path[0]] instanceof Map) return map[path[0]]._get(path.slice(1))
    else return undefined
  }

  this._put = function(path) {
    if (path[0] instanceof Array) {
      for (let option of path[0]) {
        let value = this._get([option, ...path.slice(1)])
        if (value !== undefined) return value
      }
      return undefined
    }
    
    if (!map.hasOwnProperty(path[0])) return undefined
    else if (path.length === 1) return map[path[0]]
    else if (map[path[0]] instanceof Map) return map[path[0]]._get(path.slice(1))
    else return undefined
  }

  this._putSoft = function(path, value) {
    if (path[0] instanceof Array) {
      for (let option of path[0])
        if (this._put([option, ...path.slice(1)], value))
          return true
      return false
    } else {
      if (!map.hasOwnProperty(path[0])) return false
      if (path.length > 1) {
        return map[path[0]] instanceof Map
          ? map[path[0]]._putSoft(path.slice(1), value)
          : false
      } else {
        map[path[0]] = value
        return true
      }
    }
  }

  this._putHard = function(path, value) {
    if (path[0] instanceof Array) {
      this._putHard([path[0][0], ...path.slice(1)], value)
    } else {
      if (path.length > 1) {
        if (!map.hasOwnProperty(path[0]) || !(map[path[0]] instanceof Map))
          map[path[0]] = new Map()
        map[path[0]]._putHard(path.slice(1), value)
      } else {
        map[path[0]] = value
      }
    }
  }

  this._put = function(path, value) {
    if (!this._putSoft(path, value)) this._putHard(path, value)
  }

  this.get = path => this._get(parseObjectPath(path))
  this.put = (path, value) => this._put(parseObjectPath(path), value)
}

inherits(Directory, Map)
function Directory(path, map) {
  this._put = function(path, value) {
    function canPut(path, value) {
      if (path[0] instanceof Array) {
        for (let option of path[0])
          if (this._put([option, ...path.slice(1)], value, false))
            return true
        this._put([path[0][0], ...path.slice(1)], value, true)
      } else {
      }
    }
    if (path[0] instanceof Array) {
      for (let option of path[0])
        if (this._put([option, ...path.slice(1)], value, false))
          return true
      this._put([path[0][0], ...path.slice(1)], value, true)
    } else {
      if (!map.hasOwnProperty(path[0])) {
        if (force && path.length > 1) map[path[0]] = new Map()
        else return false
      }
      if (path.length > 1) {
        return this._put(path.slice(1), value, force)
      } else {
        map[path[0]] = value
        return true
      }
    }
  }
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
    return new File(path, options.writable, options.format.parse(data))
  } catch (err) { throw `Failed to read '${parse(path).name}' due to ${err}` }
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

function parseObjectPath(path) {
  let stack = ['', [], []]

  function combineAndReplace(n, ...replace) {
    let top = stack.shift()
    if (top !== '') stack[0].push(top)
    if (n > 1) combineAndReplace(n-1)
    stack.unshift(...replace)
  }

  for (let i = 0; i < path.length; i++) {
    let c = path.charAt(i)
    if (c === '.') combineAndReplace(1, '')
    else if (c === '|') combineAndReplace(2, '', [])
    else if (c === '[') combineAndReplace(1, '', [], [])
    else if (c === ']') combineAndReplace(3, '')
    else stack[0] += c
  }

  combineAndReplace(2)
  return [stack[0]]
}

function Map(obj) {
  let changed = false
  let map = {}
  if (obj) for (let key of Object.keys(obj))
    map[key] = typeof obj[key] === 'object' ? new Map(obj[key]) : obj[key]

  this.changed = () => changed

  

  this.get = path => this._get(parseObjectPath(path))

  this._putSoft = function(path, value) {
    if (path[0] instanceof Array) {
      for (let option of path[0])
        if (this._put([option, ...path.slice(1)], value))
          return true
      return false
    } else {
      if (!map.hasOwnProperty(path[0])) return false
      if (path.length > 1) {
        return map[path[0]] instanceof Map
          ? map[path[0]]._putSoft(path.slice(1), value)
          : false
      } else {
        map[path[0]] = value
        return true
      }
    }
  }

  this._putHard = function(path, value) {
    if (path[0] instanceof Array) {
      this._putHard([path[0][0], ...path.slice(1)], value)
    } else {
      if (path.length > 1) {
        if (!map.hasOwnProperty(path[0]) || !(map[path[0]] instanceof Map))
          map[path[0]] = new Map()
        map[path[0]]._putHard(path.slice(1), value)
      } else {
        map[path[0]] = value
      }
    }
  }

  this._put = function(path, value) {
    if (!this._putSoft(path, value)) this._putHard(path, value)
  }

  this.put = (path, value) => this._put(parseObjectPath(path), value)
}