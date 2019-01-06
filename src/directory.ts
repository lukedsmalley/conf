
import * as fs from 'fs-extra'
import {join, parse} from 'path'
import {File} from './file'
import {FileMap} from './file-map'
import {Map} from './map'
import {isObject, isDirectory, isDirectorySync} from './utilities'

export {Directory, fileFrom, fileFromSync}

class Directory extends File {
  private readonly dirfilePath: string

  constructor(path: string, options: any) {
    super(path, options)
    this.dirfilePath = join(path, this.dirfile)
  }

  async enumerate(): Promise<File[]> {
    let children = await fs.readdir(this.path)
    
    if (this.options.filter) {
      let pattern = this.options.filter instanceof RegExp
          ? this.options.filter
          : new RegExp(this.options.filter)
      children = children.filter(child => {
        let match = pattern.exec(child)
        return match !== null && match.index === 0 && match[0].length === child.length
      })
    }

    if (this.options.extension)
      children = children.filter(child => child.endsWith(this.options.extension))

    let files = []
    for (let child of children.filter(child => child !== this.dirfile)) {
      let defaultsOverlay = (this.defaults.hasOwnProperty(parse(child).name) &&
          isObject(this.defaults[parse(child).name]))
            ? {defaults: this.defaults[parse(child).name] || {}}
            : {defaults: {}}
      let options = Object.assign({}, this.options, defaultsOverlay)
      files.push(await fileFrom(join(this.path, child), options))
    }

    return files
  }

  enumerateSync(): File[] {
    let children = fs.readdirSync(this.path)
    
    if (this.options.filter) {
      let pattern = this.options.filter instanceof RegExp
          ? this.options.filter
          : new RegExp(this.options.filter)
      children = children.filter(child => {
        let match = pattern.exec(child)
        return match !== null && match.index === 0 && match[0].length === child.length
      })
    }

    if (this.options.extension)
      children = children.filter(child => child.endsWith(this.options.extension))

    let files = []
    for (let child of children.filter(child => child !== this.dirfile)) {
      let defaultsOverlay = (this.defaults.hasOwnProperty(parse(child).name) &&
          isObject(this.defaults[parse(child).name]))
            ? {defaults: this.defaults[parse(child).name] || {}}
            : {defaults: {}}
      let options = Object.assign({}, this.options, defaultsOverlay)
      files.push(fileFromSync(join(this.path, child), options))
    }

    return files
  }

  async load(parent: Map | null): Promise<FileMap> {
    let data = await fs.readFile(this.dirfilePath, {encoding: this.options.encoding})
    let map = this.options.format.parse(data, this, parent)

    let children
    try {
      children = await this.enumerate()
    } catch (err) {
      throw `Failed to enumerate files in '${this.path}' due to ${err}`
    }

    for (let child of children) map.setProperty(child.name, await child.load(map), false)

    return map.assignDefaults(this.defaults)
  }

  loadSync(parent: Map | null): FileMap {
    let data = fs.readFileSync(this.dirfilePath, {encoding: this.options.encoding})
    let map = this.options.format.parse(data, this, parent)

    let children
    try {
      children = this.enumerateSync()
    } catch (err) {
      throw `Failed to enumerate files in '${this.path}' due to ${err}`
    }

    for (let child of children) map.setProperty(child.name, child.loadSync(map), false)

    return map.assignDefaults(this.defaults)
  }

  async write(data: string | Buffer) {
    await fs.mkdirs(this.path)
    await fs.writeFile(join(this.path, this.dirfile), data, {encoding: this.options.encoding})
  }

  writeSync(data: string | Buffer) {
    fs.mkdirsSync(this.path)
    fs.writeFileSync(join(this.path, this.dirfile), data, {encoding: this.options.encoding})
  }
}

async function fileFrom(path: string, options: any): Promise<File> {
  return (await isDirectory(path)) ? new Directory(path, options) : new File(path, options)
}

function fileFromSync(path: string, options: any): File {
  return isDirectorySync(path) ? new Directory(path, options) : new File(path, options)
}