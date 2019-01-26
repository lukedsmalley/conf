
import {Map} from './map'
import {PathComponent} from './path-component'
import {Step} from './step'
import {Switch} from './switch'

export {Path}

class Path {
  private components: PathComponent[] = []

  length(): number {
    return this.components.length
  }

  push(component: PathComponent) {
    this.components.push(component)
  }

  travel(map: Map, force: boolean): any {
    for (let component of this.components)
      if ((map = component.travel(map, force)) === undefined)
        return undefined
    return map
  }

  assign(map: Map, value: any) {
    if (this.components.length < 1) throw 'Cannot assign with empty path'
    let path = this.components.slice()
    while (path.length > 1)
      if (typeof (map = path.shift()!.travel(map, true)) !== 'object')
        return false
    path[0].assign(map, value)
  }

  static parse(query: string): Switch {
    let stack: any[] = [new Step(), new Path(), new Switch()]

    function combineAndReplace(n: number, ...replace: any[]) {
      if (stack.length === 1) throw 'Closing brace without opening brace'
      let top = stack.shift()
      if (top.length() > 0) stack[0].push(top)
      if (n > 1) combineAndReplace(n-1)
      stack.unshift(...replace)
    }

    for (let i = 0; i < query.length; i++) {
      let c = query.charAt(i)
      try {
        if (c === '.') combineAndReplace(1, new Step())
        else if (c === '|') combineAndReplace(2, new Step(), new Path())
        else if (c === '[') combineAndReplace(1, new Step(), new Path(), new Switch())
        else if (c === ']') combineAndReplace(3, new Step())
        else stack[0].push(c)
      } catch (err) {
        throw `${err} (<path>:${i})`
      }
    }

    combineAndReplace(2)
    if (stack.length > 1) throw 'Unterminated brace expression'
    return stack[0]
  }

  toString(): string {
    return this.components.map(c => c.toString()).join('.')
  }
}