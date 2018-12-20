
import {Node} from './map'

export {Path}

interface PathComponent {
  travel(map: Node, force?: boolean): any
  assign(map: Node, value: any, save?: boolean): Promise<void>
}

class Step implements PathComponent {
  private id: string

  constructor(id: string) {
    this.id = id
  }

  travel(map: Node, force?: boolean): any {
    if (map.getOwn(this.id) === undefined && force) map.putOwn(this.id, new Map())
    return map.getOwn(this.id)
  }

  assign(map: Node, value: any, save?: boolean) {
    return map.putOwn(this.id, value, save)
  }
}

class Path {
  private components: PathComponent[] = []

  push(component: PathComponent): void {
    this.components.push(component)
  }

  travel(map: Node, force?: boolean): any {
    for (let component of this.components)
      if ((map = component.travel(map, force)) === undefined)
        return undefined
    return map
  }

  assign(map: Node, value: any): Promise<void> {
    if (this.components.length < 1) throw 'Cannot assign with empty path'
    let path = this.components.slice()
    while (path.length > 1)
      if (typeof (map = path.shift()!.travel(map, true)) !== 'object')
        throw 'Non-object waypoint in path'
    return path[0].assign(map, value, true)
  }

  static parse(query: string): Switch {
    let stack: any[] = ['', new Path(), new Switch()]

    function combineAndReplace(n: number, ...replace: any[]) {
      if (stack.length === 1) throw 'Closing brace without opening brace'
      let top = stack.shift()
      if (typeof top === 'string') stack[0].push(new Step(top))
      else stack[0].push(top)
      if (n > 1) combineAndReplace(n-1)
      stack.unshift(...replace)
    }

    for (let i = 0; i < query.length; i++) {
      let c = query.charAt(i)
      try {
        if (c === '.') combineAndReplace(1, '')
        else if (c === '|') combineAndReplace(2, '', new Path())
        else if (c === '[') combineAndReplace(1, '', new Path(), new Switch())
        else if (c === ']') combineAndReplace(3, '')
        else stack[0] += c
      } catch (err) {
        throw `${err} (<path>:${i})`
      }
    }

    combineAndReplace(2)
    if (stack.length > 1) throw 'Unterminated brace expression'
    return stack[0]
  }
}

class Switch implements PathComponent {
  private paths: Path[] = []

  push(path: Path): void {
    this.paths.push(path)
  }

  travel(map: Node, force?: boolean): any {
    let result
    for (let path of this.paths)
      if ((result = path.travel(map, force)) !== undefined)
        return result
    return undefined
  }

  assign(map: Node, value: any) {
    if (this.paths.length < 1) throw 'Cannot assign with empty path switch'
    return this.paths[0].assign(map, value)
  }
}