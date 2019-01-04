
import * as fs from 'fs-extra'
import {parse} from 'path'

export {File}

class File {
  readonly path: string
  readonly basePath: string
  readonly encoding: string
  readonly autoSave: boolean
  readonly autoSaveSync: boolean
  readonly filter?: string

  constructor(path: string, options: any) {
    this.path = path
    this.basePath = parse(path).dir
    this.encoding = options.encoding
    this.autoSave = options.autosave
    this.autoSaveSync = options.saveSync
    this.filter = options.filter
  }

  async read(): Promise<string | Buffer> {
    return await fs.readFile(this.path, {encoding: this.encoding})
  }

  readSync(): string | Buffer {
    return fs.readFileSync(this.path, {encoding: this.encoding})
  }

  async write(data: string | Buffer) {
    await fs.mkdirs(this.basePath)
    await fs.writeFile(this.path, data, {encoding: this.encoding})
  }

  writeSync(data: string | Buffer) {
    fs.mkdirsSync(this.basePath)
    fs.writeFileSync(this.path, data, {encoding: this.encoding})
  }
}