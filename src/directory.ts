
import * as fs from 'fs-extra'
import {join} from 'path'
import {File} from './file'

export {Directory}

class Directory extends File {
  readonly dirFile: string

  constructor(path: string, options: any) {
    super(path, options)
    this.dirFile = join(path, options.dirfile || options.extension || '.conf')
  }

  async read(): Promise<string | Buffer> {
    return await fs.readFile(this.dirFile, {encoding: this.encoding})
  }

  readSync(): string | Buffer {
    return fs.readFileSync(this.dirFile, {encoding: this.encoding})
  }

  async write(data: string | Buffer) {
    await fs.mkdirs(this.path)
    await fs.writeFile(this.dirFile, data, {encoding: this.encoding})
  }

  writeSync(data: string | Buffer) {
    fs.mkdirsSync(this.path)
    fs.writeFileSync(this.dirFile, data, {encoding: this.encoding})
  }
}