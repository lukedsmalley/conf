
import * as fs from 'fs-extra'
import {parse, join} from 'path'
import {Path} from './path'

export {deeplyAssign, Node, Map}

function deeplyAssign(target: any, ...sources: any[]): any {
  function assign(target: any, source: any) {
    for (let key of source) {
      if (!target.hasOwnProperty(key) || target[key] === null || typeof target[key] !== 'object') target[key] = source[key]
      else assign(target[key], source[key])
    }
  }
  sources.forEach(source => assign(target, source))
  return target
}

interface Node {
  getOwn(id: string): any
  putOwn(id: string, value: any, save?: boolean): Promise<void>
  get(path: string): any
  put(path: string, value: any): Promise<void>
}

class Map implements Node {
  protected readonly map: any

  constructor(map?: any) {
    this.map = map === undefined ? {} : map
  }

  toObject(): object {
    return Object.assign({}, ...Object.keys(this.map).map(key => {
      return {[key]: this.map[key] instanceof Map ? this.map[key].toObject() : this.map[key]}
    }))
  }

  getOwn(id: string): any {
    return this.map[id]
  }

  putOwn(id: string, value: any) {
    this.map[id] = value
    return Promise.resolve()
  }

  get(path: string): any {
    return Path.parse(path).travel(this)
  }

  put(path: string, value: any): Promise<void> {
    return Path.parse(path).assign(this, value)
  }

  static async loadFromPath(path: string, options: any, defaults: any) {
    try {
      await fs.access(path, fs.constants.R_OK)
    } catch (err) { throw `'${parse(path).name}' could not be read due to ${err}` }
  
    if (options.writable) {
      try {
        await fs.access(path, fs.constants.W_OK)
      } catch (err) { throw `'${parse(path).name}' is not writable` }
    }

    let stat
    try {
      stat = await fs.lstat(path)
    } catch (err) { throw `Failed to get info for '${parse(path).name}' due to ${err}` }
  
    return stat.isDirectory()
      ? await Directory.load(path, options, defaults)
      : await File.load(path, options, defaults)
  }

  static loadFromPathSync(path: string, options: any, defaults: any) {
    try {
      fs.accessSync(path, fs.constants.R_OK)
    } catch (err) { throw `'${parse(path).name}' could not be read due to ${err}` }
  
    let stat
    try {
      stat = fs.lstatSync(path)
    } catch (err) { throw `Failed to get info for '${parse(path).name}' due to ${err}` }
  
    return stat.isDirectory()
      ? Directory.loadSync(path, options, defaults)
      : File.loadSync(path, options, defaults)
  }
}

abstract class Record extends Map {
  protected readonly path: string
  protected readonly options: any
  private changed: boolean = false

  protected constructor(path: string, options: any, map?: Record | any) {
    super(map instanceof Record ? map.map : map)
    this.path = path
    this.options = options
  }

  abstract async save(): Promise<void>
  abstract saveSync(): void

  putOwn(id: string, value: any, save?: boolean): Promise<void> {
    super.putOwn(id, value)
    this.changed = true
    if (!save || !this.options.autosave) return Promise.resolve()
    if (this.options.saveSync) this.saveSync()
    else return this.save()
    return Promise.resolve()
  }
}

class Directory extends Record {
  static async load(path: string, options: any, defaults: any) {
    let children
    try {
      children = await fs.readdir(path)
    } catch (err) { throw `Failed to enumerate files in directory '${parse(path).name}' due to ${err}` }

    let dirfile = options.dirfile || options.extension || '.conf'
    let hasDirFile = children.indexOf(dirfile) >= 0 && children.splice(children.indexOf(dirfile), 1)[0]
    let data: any = hasDirFile ? await Map.loadFromPath(join(path, dirfile), options, defaults) : undefined
    let directory = new Directory(path, options, data)

    if (options.filter) {
      let pattern = options.filter instanceof RegExp ? options.filter : new RegExp(options.filter)
      children = children.filter(child => {
        let match = pattern.exec(child)
        return match !== null && match.index === 0 && match[0].length === child.length
      })
    }

    if (options.extension) children = children.filter(child => child.endsWith(options.extension))

    for (let child of children) {
      let prop = parse(child).name
      let childDefaults = defaults.hasOwnProperty(prop) && typeof defaults[prop] === 'object' ? defaults[prop] : {}
      directory.map[prop] = await Map.loadFromPath(join(path, child), options, childDefaults)
    }

    return directory
  }

  static loadSync(path: string, options: any, defaults: any) {
    let children
    try {
      children = fs.readdirSync(path)
    } catch (err) { throw `Failed to enumerate files in directory '${parse(path).name}' due to ${err}` }

    let dirfile = options.dirfile || options.extension || '.conf'
    let hasDirFile = children.indexOf(dirfile) >= 0 && children.splice(children.indexOf(dirfile), 1)[0]
    let data: any = hasDirFile ? Map.loadFromPathSync(join(path, dirfile), options, defaults) : undefined
    let directory = new Directory(path, options, data)

    if (options.filter) {
      let pattern = options.filter instanceof RegExp ? options.filter : new RegExp(options.filter)
      children = children.filter(child => {
        let match = pattern.exec(child)
        return match !== null && match.index === 0 && match[0].length === child.length
      })
    }

    if (options.extension) children = children.filter(child => child.endsWith(options.extension))

    for (let child of children) {
      let prop = parse(child).name
      let childDefaults = defaults.hasOwnProperty(prop) && typeof defaults[prop] === 'object' ? defaults[prop] : {}
      directory.map[prop] = Map.loadFromPathSync(join(path, child), options, childDefaults)
    }

    return directory
  }

  async save() {
    try {
      await fs.mkdirs(this.path)
    } catch (err) { throw `Failed to create directory '${parse(this.path).name}' due to ${err}` }

    let data: any = {}
    for (let key in this.map) {
      if (this.map[key] instanceof Record) await this.map[key].save()
      else if (this.map[key] instanceof Map) data[key] = this.map[key].toObject()
      else data[key] = this.map[key]
    }

    let dirfile = this.options.dirfile || this.options.extension || '.conf'
    try {
      await fs.writeFile(join(this.path, dirfile), this.options.format.stringify(data), {encoding: this.options.encoding})
    } catch (err) { throw `Failed to write directory-file config for '${parse(this.path).name}' due to ${err}` }
  }

  saveSync() {
    try {
      fs.mkdirsSync(this.path)
    } catch (err) { throw `Failed to create directory '${parse(this.path).name}' due to ${err}` }

    let data: any = {}
    for (let key in this.map) {
      if (this.map[key] instanceof Record) this.map[key].saveSync()
      else if (this.map[key] instanceof Map) data[key] = this.map[key].toObject()
      else data[key] = this.map[key]
    }

    let dirfile = this.options.dirfile || this.options.extension || '.conf'
    try {
      fs.writeFileSync(join(this.path, dirfile), this.options.format.stringify(data), {encoding: this.options.encoding})
    } catch (err) { throw `Failed to write directory-file config for '${parse(this.path).name}' due to ${err}` }
  }
}

class File extends Record {
  static async load(path: string, options: any, defaults: any) {
    try {
      await fs.access(path, fs.constants.R_OK)
    } catch (err) { throw `'${parse(path).name}' could not be read due to ${err}` }
  
    try {
      let data = await fs.readFile(path, {encoding: options.encoding})
      return new File(path, options, deeplyAssign({}, defaults, options.format.parse(data)))
    } catch (err) { throw `Failed to read '${parse(path).name}' due to ${err}` }
  }

  static loadSync(path: string, options: any, defaults: any) {
    try {
      fs.accessSync(path, fs.constants.R_OK)
    } catch (err) { throw `'${parse(path).name}' could not be read due to ${err}` }
  
    try {
      let data = fs.readFileSync(path, {encoding: options.encoding})
      return new File(path, options, deeplyAssign({}, defaults, options.format.parse(data)))
    } catch (err) { throw `Failed to read '${parse(path).name}' due to ${err}` }
  }

  async save() {
    let data: any = {}
    for (let key in this.map)
      data[key] = this.map[key] instanceof Map ? this.map[key].toObject() : this.map[key]

    try {
      await fs.writeFile(this.path, this.options.format.stringify(data), {encoding: this.options.encoding})
    } catch (err) { throw `Failed to write config '${parse(this.path).name}' due to ${err}` }
  }

  saveSync() {
    let data: any = {}
    for (let key in this.map)
      data[key] = this.map[key] instanceof Map ? this.map[key].toObject() : this.map[key]

    try {
      fs.writeFileSync(this.path, this.options.format.stringify(data), {encoding: this.options.encoding})
    } catch (err) { throw `Failed to write config '${parse(this.path).name}' due to ${err}` }
  }
}