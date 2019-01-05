
import {join} from 'path'
import {Path} from './path'
import {File} from './file'
import {FileMap} from './file-map'
import {Directory} from './directory'
import {isObject} from './utilities'

export {Map}

class Map {
  private readonly properties: any = {}
  private parent: Map | null

  protected constructor(parent: Map | null, properties?: any) {
    this.parent = parent
    if (isObject(properties)) {
      for (let key in properties) {   
        if (properties[key] instanceof Array) this.properties[key] = properties[key]
        else if (properties[key] instanceof Map) this.properties[key] = properties[key].clone(this)
        else if (typeof properties[key] === 'object') this.properties[key] = new Map(this, properties[key])
        else this.properties[key] = properties[key]
      }
    }
  }

  clone(parent: Map | null): Map {
    let map = new Map(parent)
    for (let key in this.properties)
      map.setProperty(key, this.properties[key] instanceof Map
          ? this.properties[key].clone()
          : this.properties[key], false)
    return map
  }

  eject(): any {
    let obj: any = {}
    for (let key of this.getSerializablePropertyKeys())
      obj[key] = this.properties[key] instanceof Map 
          ? this.properties[key].eject()
          : this.properties[key]
    return obj
  }

  getSerializablePropertyKeys(): string[] {
    return Object.keys(this.properties)
  }

  protected autoSave(): any {
    return this.parent ? this.parent.autoSave() : undefined
  }

  async save() {
    this.parent ? await this.parent.save() : null
  }

  saveSync() {
    this.parent ? this.parent.saveSync() : null
  }

  getProperty(key: string): any {
    return this.properties[key]
  }

  setProperty(key: string, value: any, save: boolean): any {
    if (this.properties.hasOwnProperty(key) && this.properties[key] instanceof Map)
      this.properties[key].parent = null

    if (isObject(value)) value = new Map(this, value)
    else if (value instanceof Map) value.parent = this

    if (value === undefined) delete this.properties[key]
    else this.properties[key] = value

    let autosave = save ? this.autoSave() : undefined
    return autosave instanceof Promise ? autosave.then(() => value) : value
  }

  get(query: string): any {
    return Path.parse(query).travel(this, false)
  }

  set(query: string, value: any): any {
    return Path.parse(query).assign(this, value)
  }

  assignDefaults(defaults: any, path: string, options: any) {
    for (let key in this.properties)
      if (this.properties[key] instanceof Map && defaults.hasOwnProperty(key) &&
          isObject(defaults[key]))
        this.properties[key].weaklyAssign(defaults[key], join(path, key))

    for (let key in defaults) {
      if (key === '$$file' || key === '$$dir') continue

      if (!this.properties.hasOwnProperty(key)) { //Recursive here to create $$files and $$dirs
        if (defaults[key].$$dir) {
          let map = new options.format(new Directory(join(path, key), options))
          map.assignDefaults(defaults[key], join(path, key), options)
          this.setProperty(key, map, false)
        } else if (defaults[key].$$file) {
          let map = new options.format(new File(join(path, defaults[key].$$file), options))
          map.assignDefaults(defaults[key], join(path, key), options)
          this.setProperty(key, map, false)
        } else {
          this.setProperty(key, defaults[key], false)
        }
      }
    }

    return this
  }
}