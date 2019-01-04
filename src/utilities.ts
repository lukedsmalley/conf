
import * as fs from 'fs-extra'
import {Map} from './map'

export {deeplyAssign, isObject, isAccessible, isAccessibleSync, isDirectory, isDirectorySync}

function deeplyAssign(target: any, ...sources: any[]): any {
  function assign(target: any, source: any) {
    for (let key of source) {
      if (!target.hasOwnProperty(key) || target[key] === null || typeof target[key] !== 'object') target[key] = source[key]
      else assign(target[key], source[key])
    }
  }
  sources.forEach(source => assign(target, source))
  return target
}

function isObject(value: any): boolean {
  return !(value instanceof Array) && !(value instanceof Map) && typeof value === 'object' && value !== null
}

async function isAccessible(path: string, permission: number): Promise<boolean> {
  try {
    await fs.access(path, permission)
    return true
  } catch (err) {
    return false
  }
}

function isAccessibleSync(path: string, permission: number): boolean {
  try {
    fs.accessSync(path, permission)
    return true
  } catch (err) {
    return false
  }
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await fs.lstat(path)).isDirectory()
  } catch (err) {
    return false
  }
}

function isDirectorySync(path: string): boolean {
  try {
    return fs.lstatSync(path).isDirectory()
  } catch (err) {
    return false
  }
}