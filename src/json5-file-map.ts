
import {parse, stringify} from 'json5'
import {File} from './file'
import {FileMap} from './file-map'
import {Map} from './map'
import {deeplyAssign} from './utilities'

export {JSON5FileMap}

class JSON5FileMap extends FileMap {
  protected constructor(file: File, parent: Map | null, properties?: any) {
    super(file, parent, properties)
  }

  serialize(): string {
    return stringify(this.eject())
  }

  static async loadJSON5(file: File, options: any, parent: Map | null): Promise<JSON5FileMap> {
    let data = deeplyAssign(parse((await file.read()) as string), options.defaults || {})
    return new JSON5FileMap(file, parent, data)
  }

  static loadJSON5Sync(file: File, options: any, parent: Map | null): JSON5FileMap {
    let data = deeplyAssign(parse(file.readSync() as string), options.defaults || {})
    return new JSON5FileMap(file, parent, data)
  }
}