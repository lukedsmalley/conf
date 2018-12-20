
const conf = require('.')
import * as json5 from './json5'

let confSync = (...args) => conf({sync: true}, ...args)
confSync.json5 = json5

module.exports = confSync