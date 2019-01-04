
import {Map} from './map'
import {PathComponent} from './path-component'

export {Step}

class Step implements PathComponent {
  private id: string

  constructor(id: string) {
    this.id = id
  }

  travel(map: Map, force: boolean): any {
    if (map.getProperty(this.id) === undefined && force) map.setProperty(this.id, {}, false)
    return map.getProperty(this.id)
  }

  assign(map: Map, value: any): any {
    return map.setProperty(this.id, value, true)
  }
}