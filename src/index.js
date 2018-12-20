
import * as fs from 'fs-extra'
import {Map} from './map'
import * as json5 from './json5'

module.exports = conf

let cache = {}

function conf(...args) {
  let paths = args.filter(arg => typeof arg === 'string')
  let options = Object.assign({
    defaults: {},
    encoding: 'utf8',
    format: json5,
    reload: false,
    autosave: false,
    saveSync: false,
    sync: false,
    writable: false
  }, ...args.filter(arg => typeof arg === 'object'))

  if (!options.reload) for (let path of paths) if (cache.hasOwnProperty(path)) return cache[path]

  if (!options.sync) {
    return (async function() {
      let map
      for (let path of paths) {
        try {
          await fs.access(path, fs.constants.R_OK)
        } catch (err) { continue }
        map = await Map.loadFromPath(path, options)
        for (let path of paths) cache[path] = map
        return cache[path]
      }
      throw 'Configuration does not exist at the given path(s)'
    })()
  }

  let map
  for (let path of paths) {
    try {
      fs.accessSync(path, fs.constants.R_OK)
    } catch (err) { continue }
    map = Map.loadFromPathSync(path, options)
    for (let path of paths) cache[path] = map
    return cache[path]
  }
  throw 'Configuration does not exist at the given path(s)'
}

conf.json5 = json5