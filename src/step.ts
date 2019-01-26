
import {Map} from './map'
import {PathComponent} from './path-component'

export {Step}

class Step implements PathComponent {
  private id: string = ''

  length(): number {
    return this.id.length
  }

  push(c: string) {
    this.id += c
  }

  travel(map: Map, force: boolean): any {
    //The path-following loops somehow bypass this type-check
    if (!(map instanceof Map)) return undefined
    if (map.getProperty(this.id) === undefined && force) map.setProperty(this.id, {}, false)
    return map.getProperty(this.id)
  }

  assign(map: Map, value: any): any {
    return map.setProperty(this.id, value, true)
  }

  toString(): string {
    return this.id
  }
}