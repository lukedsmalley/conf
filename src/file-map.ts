
import * as fs from 'fs-extra'
import {join, parse} from 'path'
import {Directory} from './directory'
import {File} from './file'
import {Map} from './map'
import {isAccessible, isAccessibleSync, isDirectory, isDirectorySync} from './utilities'

export {FileMap}

abstract class FileMap extends Map {
  private file: File

  protected constructor(file: File, parent: Map | null, properties?: any) {
    super(parent, properties)
    this.file = file
  }

  getSerializablePropertyKeys(): any {
    return super.getSerializablePropertyKeys()
        .filter(key => !(this.get(key) instanceof FileMap))
  }

  protected autoSave(): any {
    if (!this.file.autoSave) return undefined
    if (this.file.autoSaveSync) this.saveSync()
    return this.file.autoSaveSync ? undefined : this.save()
  }

  protected abstract serialize(): string | Buffer

  async save() {
    if (this.file instanceof Directory) {
      for (let key of super.getSerializablePropertyKeys()
          .filter(key => this.get(key) instanceof FileMap)) {
        await this.get(key).save()
      }

      if (this.getSerializablePropertyKeys().length === 0) return
    }

    try {
      await this.file.write(this.serialize())
    } catch (err) {
      throw `Failed to write config '${this.file.path}' due to ${err}`
    }
  }

  saveSync() {
    if (this.file instanceof Directory) {
      for (let key of super.getSerializablePropertyKeys()
          .filter(key => this.get(key) instanceof FileMap)) {
        this.get(key).saveSync()
      }

      if (this.getSerializablePropertyKeys().length === 0) return
    }

    try {
      this.file.writeSync(this.serialize())
    } catch (err) {
      throw `Failed to write config '${this.file.path}' due to ${err}`
    }
  }

  static async load(path: string, options: any, parent?: Map): Promise<FileMap> {
    //Iteration in index.js checks for visibility (F_OK)
    if (!(await isAccessible(path, fs.constants.R_OK))) 
      throw `Configuration at '${path}' is unreadable`

    if (options.writable && !(await isAccessible(path, fs.constants.W_OK)))
      throw `Configuration at '${path}' is unwritable`

    let file = await isDirectory(path) ? new Directory(path, options) : new File(path, options)
    let map = await options.format.load(file, options, parent)

    if (file instanceof Directory) {
      let children
      try {
        children = await fs.readdir(file.path)
      } catch (err) {
        throw `Failed to enumerate files in '${file.path}' due to ${err}`
      }

      if (options.filter) {
        let pattern = options.filter instanceof RegExp ? options.filter : new RegExp(options.filter)
        children = children.filter(child => {
          let match = pattern.exec(child)
          return match !== null && match.index === 0 && match[0].length === child.length
        })
      }
  
      if (options.extension)
        children = children.filter(child => child.endsWith(options.extension))
  
      children = children.filter(child => child !== (options.dirfile || options.extension || '.conf'))

      for (let child of children)
        map.put(parse(child).name, await FileMap.load(join(path, child), options, map), false)
    }

    return map
  }

  static loadSync(path: string, options: any, parent?: Map): FileMap {
    //Iteration in index.js checks for visibility (F_OK)
    if (!isAccessibleSync(path, fs.constants.R_OK))
      throw `Configuration at '${path}' is unreadable`

    if (options.writable && !isAccessibleSync(path, fs.constants.W_OK))
      throw `Configuration at '${path}' is unwritable`

    let file = isDirectorySync(path) ? new Directory(path, options) : new File(path, options)
    let map = options.format.loadSync(file, options, parent)

    if (file instanceof Directory) {
      let children
      try {
        children = fs.readdirSync(file.path)
      } catch (err) {
        throw `Failed to enumerate files in '${file.path}' due to ${err}`
      }

      if (options.filter) {
        let pattern = options.filter instanceof RegExp ? options.filter : new RegExp(options.filter)
        children = children.filter(child => {
          let match = pattern.exec(child)
          return match !== null && match.index === 0 && match[0].length === child.length
        })
      }
  
      if (options.extension)
        children = children.filter(child => child.endsWith(options.extension))
  
      children = children.filter(child => child !== (options.dirfile || options.extension || '.conf'))

      for (let child of children)
        map.put(parse(child).name, FileMap.loadSync(join(path, child), options, map), false)
    }

    return map
  }
}