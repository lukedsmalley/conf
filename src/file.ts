
import * as fs from 'fs-extra'
import {join, parse} from 'path'
import {FileMap} from './file-map';
import {Map} from './map'
import * as utilities from './utilities'
import {isObject, isAccessible, isAccessibleSync} from './utilities'

export {File, fileFrom, fileFromSync}

class File {
  readonly path: string
  readonly name: string
  readonly basePath: string
  readonly isDirectory: boolean
  readonly options: any

  constructor(path: string, isDirectory: boolean, options: any) {
    this.path = path
    this.name = parse(path).name
    this.basePath = parse(path).dir
    this.isDirectory = isDirectory
    this.options = Object.assign({}, options)
    this.options.dirFile = options.dirFile || options.extension || '.conf'
  }

  private deriveOptions(fileName: string): any {
    let name = parse(fileName).name
    if (this.options.defaults && this.options.defaults.hasOwnProperty(name) &&
        isObject(this.options.defaults[name]))
      return Object.assign({}, this.options, {defaults: this.options.defaults[name]})
    return this.options
  }

  private async enumerate(): Promise<File[]> {
    let fileNames
    try {
      fileNames = await fs.readdir(this.path)
    } catch (err) {
      throw `Failed to enumerate files in '${this.path}' due to ${err}`
    }
    
    let filter = new RegExp('.*', 'y')
    if (typeof this.options.filter === 'string')
      filter = new RegExp(this.options.filter, 'y')
    else if (typeof this.options.extension === 'string')
      filter = new RegExp(this.options.extension + '$', 'y')

    return await Promise.all(fileNames
        .filter(fileName => fileName !== this.options.dirFile)
        .filter(fileName => filter.test(fileName))
        .map(fileName => fileFrom(join(this.path, fileName), this.deriveOptions(fileName))))
  }

  private enumerateSync(): File[] {
    let fileNames
    try {
      fileNames = fs.readdirSync(this.path)
    } catch (err) {
      throw `Failed to enumerate files in '${this.path}' due to ${err}`
    }
    
    let filter = new RegExp('.*', 'y')
    if (typeof this.options.filter === 'string')
      filter = new RegExp(this.options.filter, 'y')
    else if (typeof this.options.extension === 'string')
      filter = new RegExp(this.options.extension + '$', 'y')

    return fileNames.filter(fileName => fileName !== this.options.dirFile)
        .filter(fileName => filter.test(fileName))
        .map(fileName => fileFromSync(join(this.path, fileName), this.deriveOptions(fileName)))
  }

  async load(parent: Map | null): Promise<FileMap> {
    if (this.options.autoSave && !(await isAccessible(this.path, fs.constants.W_OK)))
      throw `Configuration at '${this.path}' is unwritable`

    let map
    try {
      let path = this.isDirectory ? this.path : join(this.path, this.options.dirFile)
      let data = await fs.readFile(path, {encoding: this.options.encoding})
      map = this.options.format.parse(data, this, parent)
    } catch (err) {
      throw `Failed to read config at '${this.path}' due to ${err}`
    }
    
    if (this.isDirectory)
      for (let child of await this.enumerate())
        map.setProperty(child.name, await child.load(map), false)

    return map.assignDefaults(this.options.defaults)
  }

  loadSync(parent: Map | null): FileMap {
    if (this.options.autoSave && !isAccessibleSync(this.path, fs.constants.W_OK))
      throw `Configuration at '${this.path}' is unwritable`

    let map
    try {
      let path = this.isDirectory ? this.path : join(this.path, this.options.dirFile)
      let data = fs.readFileSync(path, {encoding: this.options.encoding})
      map = this.options.format.parse(data, this, parent)
    } catch (err) {
      throw `Failed to read config at '${this.path}' due to ${err}`
    }
    
    if (this.isDirectory)
      for (let child of this.enumerateSync())
        map.setProperty(child.name, child.loadSync(map), false)

    return map.assignDefaults(this.options.defaults)
  }

  async write(data: string | Buffer) {
    let path = this.isDirectory ? this.path : join(this.path, this.options.dirFile)
    await fs.mkdirs(this.isDirectory ? this.basePath : this.path)
    await fs.writeFile(path, data, {encoding: this.options.encoding})
  }

  writeSync(data: string | Buffer) {
    let path = this.isDirectory ? this.path : join(this.path, this.options.dirFile)
    fs.mkdirsSync(this.isDirectory ? this.basePath : this.path)
    fs.writeFileSync(path, data, {encoding: this.options.encoding})
  }
}

async function fileFrom(path: string, options: any): Promise<File> {
  return new File(path, await utilities.isDirectory(path), options)
}

function fileFromSync(path: string, options: any): File {
  return new File(path, utilities.isDirectorySync(path), options)
}