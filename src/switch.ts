
import {Map} from './map'
import {Path} from './path'
import {PathComponent} from './path-component'

export {Switch}

class Switch implements PathComponent {
  private paths: Path[] = []

  length(): number {
    return this.paths.length
  }

  push(path: Path) {
    this.paths.push(path)
  }

  travel(map: Map, force: boolean): any {
    let result
    for (let path of this.paths)
      if ((result = path.travel(map, force)) !== undefined)
        return result
    return undefined
  }

  assign(map: Map, value: any) {
    if (this.paths.length < 1) throw 'Cannot assign with empty path switch'
    this.paths[0].assign(map, value)
  }

  toString(): string {
    return `[${this.paths.map(p => p.toString()).join('|')}]`
  }
}