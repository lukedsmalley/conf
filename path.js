
const {Map} = require('./map')

module.exports = {
  parseObjectPath
}

function Step(id) {
  this.travel = function(map, force) {
    if (map._get(id) === undefined && force) map._put(id, new Map())
    return map._get(id)
  }

  this.assign = function(map, value) {
    return map._put(id, value)
  }
}

function Path() {
  let components = []

  this.push = components.push

  this.travel = function(map, force) {
    for (let component of components)
      if ((map = component.travel(map, force)) === undefined)
        return undefined
    return map
  }

  this.assign = function(map, value) {
    let path = components.slice()
    while (path.length > 1)
      if (typeof (map = path.unshift().travel(map, true)) !== 'object')
        return false
    return path.length === 1 && path[0].assign(map, value)
  }
}

function Switch() {
  let paths = []

  this.push = paths.push

  this.travel = function(map, force) {
    let result
    for (let path of paths)
      if ((result = path.travel(map, force)) !== undefined)
        return result
    return undefined
  }

  this.assign = function(map, value) {
    return paths.length > 0 && paths[0].assign(map, value)
  }
}

function parseObjectPath(path) {
  let stack = ['', new Path(), new Switch()]

  function combineAndReplace(n, ...replace) {
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