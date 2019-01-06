
import * as fs from 'fs-extra'
import {parse} from 'path'
import {FileMap} from './file-map';
import {Map} from './map'
import {isAccessible, isAccessibleSync} from './utilities'

export {File}

class File {
  readonly path: string
  readonly name: string
  readonly basePath: string
  readonly options: any
  readonly dirfile: string
  readonly defaults: any

  constructor(path: string, options: any) {
    this.path = path
    this.name = parse(path).name
    this.basePath = parse(path).dir
    this.options = options
    this.dirfile = options.dirfile || options.extension || '.conf'
    this.defaults = options.defaults || {}
  }

  async load(parent: Map | null): Promise<FileMap> {
    if (this.options.autoSave && !(await isAccessible(this.path, fs.constants.W_OK)))
      throw `Configuration is unwritable`
    let data = await fs.readFile(this.path, {encoding: this.options.encoding})
    let map = this.options.format.parse(data, this, parent)
    return map.assignDefaults(this.defaults)
  }

  loadSync(parent: Map | null): FileMap {
    if (this.options.autoSave && !isAccessibleSync(this.path, fs.constants.W_OK))
      throw `Configuration is unwritable`
    let data = fs.readFileSync(this.path, {encoding: this.options.encoding})
    let map = this.options.format.parse(data, this, parent)
    return map.assignDefaults(this.defaults)
  }

  async write(data: string | Buffer) {
    await fs.mkdirs(this.basePath)
    await fs.writeFile(this.path, data, {encoding: this.options.encoding})
  }

  writeSync(data: string | Buffer) {
    fs.mkdirsSync(this.basePath)
    fs.writeFileSync(this.path, data, {encoding: this.options.encoding})
  }
}