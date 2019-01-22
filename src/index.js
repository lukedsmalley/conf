
import * as fs from 'fs-extra'
import {File, fileFrom, fileFromSync} from './file'
import {JSON5FileMap} from './json5-file-map'
import {deeplyAssign} from './utilities'

module.exports = conf

conf.json5 = JSON5FileMap

let cache = {}

function conf(...args) {
  let paths = args.filter(arg => typeof arg === 'string')
  let options = deeplyAssign({
    create: false,    // Save config at first given path if no config is found
    defaults: null,   // Default config structure and values; An exception is thrown if defaults are null and no config is found
    encoding: 'utf8', // Encoding for fs.readFile/writeFile
    format: conf.json5,    // Object providing parse(str) and stringify(obj) functions
    reload: false,    // Bypass cache and force loading of the config files
    autosave: false,  // Save config after map.put is used
    saveOnLoad: false, // Save config immediately after loading and applying default values
    saveSync: false,  // Make autosave use synchronous writeFile
    sync: false      // Load config syncronously
  }, ...args.filter(arg => typeof arg === 'object'))

  if (!options.reload) for (let path of paths) if (cache.hasOwnProperty(path)) return cache[path]

  if (!options.sync) {
    return (async function() {
      for (let path of paths) {
        try {
          await fs.access(path, fs.constants.F_OK)
        } catch (err) { continue }
        let file = await fileFrom(path, options)
        let map = await file.load(null)
        if (options.saveOnLoad) await map.save()
        for (let path of paths) cache[path] = map
        return map
      }

      if (!options.defaults) throw 'Configuration does not exist at the given path(s)'

      let map = cache[paths[0]] = new options.format(new File(paths[0], false, options), null)
      map.assignDefaults(options.defaults, paths[0], options)
      if (options.create) await map.save()
      return map
    })()
  }

  for (let path of paths) {
    try {
      fs.accessSync(path, fs.constants.F_OK)
    } catch (err) { continue }
    let file = fileFromSync(path, options)
    let map = file.loadSync(null)
    if (options.saveOnLoad) map.saveSync()
    for (let path of paths) cache[path] = map
    return map
  }

  if (!options.defaults) throw 'Configuration does not exist at the given path(s)'

  let map = cache[paths[0]] = new options.format(new File(paths[0], false, options), null)
  map.assignDefaults(options.defaults, paths[0], options)
  if (options.create) map.saveSync()
  return map
}