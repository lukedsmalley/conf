
import {parse} from 'json5'
import * as json5 from 'json5'

export {parse, stringify}

let stringify: (data: any) => string = data => json5.stringify(data, null, 2)