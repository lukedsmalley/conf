
import {parse, stringify} from 'json5'
import {File} from './file'
import {FileMap} from './file-map'
import {Map} from './map'

export {JSON5FileMap}

class JSON5FileMap extends FileMap {
  protected constructor(file: File, parent: Map | null, properties?: any) {
    super(file, parent, properties)
  }

  serialize(): string {
    return stringify(this.eject())
  }

  static async parse(data: string | Buffer, file: File, parent: Map | null): Promise<JSON5FileMap> {
    return new JSON5FileMap(file, parent, parse(data as string))
  }
}