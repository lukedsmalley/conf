
const fs = require('fs-extra')
const JSON5 = require('json5')
const {join, parse, resolve} = require('path')

function loadConfigObjectSync(path, checkWrite, objectParser) {
  if (checkWrite) {
    try {
      fs.accessSync(path, fs.constants.W_OK)
    } catch (err) { throw `Configuration does not exist or is not writable` }
  }
  let stat
  try {
    fs.accessSync(path, fs.constants.R_OK)
    stat = fs.lstatSync(path)
  } catch (err) { throw `Configuration could not be read due to ${err}` }
  if (stat.isDirectory()) {
    let ns = {}
    let entries
    try {
      entries = fs.readdirSync(path)
    } catch (err) { throw `Failed to list contents of the configuration directory` }
    for (let entry of entries) {
      let name = parse(entry).name
      ns[name] = loadPathSync(join(path, entry))
    }
    return ns
  } else {
    let data
    try {
      data = fs.readFileSync(path)
    } catch (err) { throw `Failed to read config file due to ${err}` }
    return objectParser(data)
  }
}

async function loadConfigObject(path, checkWrite, objectParser) {
  if (checkWrite) {
    try {
      await fs.access(path, fs.constants.W_OK)
    } catch (err) { throw `Configuration does not exist or is not writable` }
  }
  let stat
  try {
    await fs.access(path, fs.constants.R_OK)
    stat = await fs.lstat(path)
  } catch (err) { throw `Configuration could not be read due to ${err}` }
  if (stat.isDirectory()) {
    let ns = {}
    let entries
    try {
      entries = await fs.readdir(path)
    } catch (err) { throw `Failed to list contents of the configuration directory` }
    for (let entry of entries) {
      let name = parse(entry).name
      ns[name] = await loadFromPath(join(path, entry))
    }
    return ns
  } else {
    let data
    try {
      data = await fs.readFile(path)
    } catch (err) { throw `Failed to read config file due to ${err}` }
    return objectParser(data)
  }
}

function parseQuery(query) {
  let stack = ['', [], []]

  function combineAndReplace(n, ...replace) {
    let top = stack.shift()
    if (top !== '') stack[0].push(top)
    if (n > 1) combineAndReplace(n-1)
    stack.unshift(...replace)
  }

  for (let i = 0; i < query.length; i++) {
    let c = query.charAt(i)
    if (c === '.') combineAndReplace(1, '')
    else if (c === '|') combineAndReplace(2, '', [])
    else if (c === '[') combineAndReplace(1, '', [], [])
    else if (c === ']') combineAndReplace(3, '')
    else stack[0] += c
  }

  combineAndReplace(2)
  return stack[0]
}

function followQuery(queryOpts, entry) {
  function followQueryPath(queryPath, entry) {
    let ns = entry
    for (let prop of queryPath) {
      if (ns === undefined || ns === null) return undefined
      if (prop instanceof Array) ns = followQuery(prop, ns)
      else ns = ns[prop]
    }
    return ns
  }

  for (let queryPath of queryOpts) {
    let result = followQueryPath(queryPath, entry)
    if (result !== undefined) return result
  }

  return undefined
}

function placeByQuery(query, target, value, all=true) {
  function placeByQueryStep(query, target, value, all) {
    if (query[0] instanceof Array) placeByQuery(query[0], target, value, all)
    else if (query.length > 1) placeByQueryStep(query.slice(1), target[query[0]], value, all)
    else target[query[0]] = value
  }
  if (all) for (let queryPath of query) placeByQueryStep(queryPath, target, value, all)
  else placeByQueryStep(query[0], target, value, all)
}

function createQueryObject(defaults, config, path, setup) {
  return new Proxy(config, {
    get: function(o, path, r) {
      let query = parseQuery(path)
      let value = followQuery(query, config)
      if (config !== undefined) return value
      else return followQuery(query, defaults)
    },
    set: function(o, path, value, r) {
      placeByQuery(parseQuery(path), config, value)
    },
    apply: function(o, _this, args) {
      (function(path, value, sync=false) {
        let query = parseQuery(path)
        if (value === undefined) {
          if (followQuery(query, config) === undefined &&
              followQuery(query, defaults) === undefined)
            throw `Could not resolve config property '${path}'`
        } else {
          placeByQuery(query, config, value)
          //Would save here
        }
      }).apply(_this, args)
    }
  })
}

const cache = {}

function conf(path, options) {
  path = resolve(path)

  let setup = Object.assign({
    sync: false,
    writable: false,
    reload: false,
    defaults: {},
    parse: JSON5.parse,
    stringify: data => JSON5.stringify(data, null, 2)
  }, options)

  if (!setup.reload && cache.hasOwnProperty(path)) return cache[path]

  if (!setup.sync) {
    return (async function() {
      let config = await loadConfigObject(path, setup.writable, setup.parse)
      return cache[path] = createQueryObject(setup.defaults, config, path)
    })()
  }

  let config = loadConfigObjectSync(path, setup.writable, setup.parse)
  return cache[path] = createQueryObject(setup.defaults, config, path)
}

module.exports = conf

module.exports.from = function(config, defaults={}) {
  return createQueryObject(defaults, config, null, null)
}