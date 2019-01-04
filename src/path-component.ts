
import {Map} from './map'

export {PathComponent}

interface PathComponent {
  travel(map: Map, force?: boolean): any
  assign(map: Map, value: any): void
}