
import * as fs from 'fs-extra'
import {parse, join} from 'path'
import {Path} from './path'

export {Map}

interface Node {
  getOwn(id: string): any
  putOwn(id: string, value: any): void
  get(path: string): any
  put(path: string, value: any): void
}

class Map implements Node {
  protected map: any

  constructor(map?: any) {
    this.map = map === undefined ? [] : map
  }

  eject(): any {
    return Object.assign({}, ...Object.keys(this.map).map(key => {
      return {[key]: this.map[key] instanceof Map ? this.map[key].eject() : this.map[key]}
    }))
  }

  getOwn: (id: string) => any = id => this.map[id]
  putOwn: (id: string, value: any) => void = (id, value) => this.map[id] = value

  get: (path: string) => any = path => Path.parse(path).travel(this)
  put: (path: string, value: any) => void = (path, value) => Path.parse(path).assign(this, value)
}

async function loadMapFromPath(path: string, options: any) {
  try {
    await fs.access(path, fs.constants.R_OK)
  } catch (err) { throw `'${parse(path).name}' could not be read due to ${err}` }

  let stat
  try {
    stat = await fs.lstat(path)
  } catch (err) { throw `Failed to get info for '${parse(path).name}' due to ${err}` }

  return stat.isDirectory()
    ? await Directory.load(path, options)
    : await File.load(path, options)
}

class Directory extends Map {
  private path: string
  private dirFile: string
  private encoding: string
  private format: (data: any) => string

  private constructor(path: string, options: any) {
    super()
    this.path = path
    this.dirFile = options.dirfile || options.extension || '.conf'
    this.encoding = options.encoding
    this.stringify = options.format.stringify
  }

  static async load(path: string, options: any) {
    let directory = new Directory(path, options)

    let children
    try {
      children = await fs.readdir(path)
    } catch (err) { throw `Failed to enumerate files in directory '${parse(path).name}' due to ${err}` }

    if (children.indexOf(directory.dirFile) >= 0) {
      children.splice(children.indexOf(directory.dirFile), 1)
      directory.map = await loadMapFromPath(path, options)
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
      directory.map[child] = await loadMapFromPath(join(path, child), options)

    return directory
  }

  async save() {
    try {
      await fs.mkdirs(this.path)
    } catch (err) { throw `Failed to create directory '${parse(this.path).name}' due to ${err}` }

    let dirData = {}
    for (let key of this.map) {
      if (this.map[key] instanceof Directory || this.map[key] instanceof File) await this.map[key].save()
      else if (this.map[key] instanceof Map) dirData[key] = this.map[key].raw()
    }

    let dirFile = options.dirfile || options.extension || '.conf'

    try {
      await fs.writeFile(dirFile, options.format.stringify(dirData), {encoding: options.encoding})
    } catch (err) { throw `Failed to write directory config for '${parse(path).name}' due to ${err}` }
  }
}