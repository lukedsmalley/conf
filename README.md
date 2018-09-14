<div align="center">
  <h1>conf</h1>
  <p>Quick but perhaps not entirely dirty configuration file loader for Node.js</p>
</div>

<h2 align="center">Installation</h2>

```bash
npm install lukedsmalley/conf
```

No NPM profile yet, friends.

<h2 align="center">Loading Configuration</h2>

The module can load files or directory structures. It will consume whatever path it is given, and currently will not discriminate based upon file extensions (TODO, probably). 

One may wish to load configuration asynchronously:

```js
const conf = require('conf')

;(async function main() {
  let config = await conf('./app.json5')
})()
```

Synchronous loading is also possible:

```js
const conf = require('conf')

const config = conf('./app.json5', {sync: true})
```

An options object may be passed to the `conf` function, as illustrated. Default values are as follows:

```js
{
  sync: false,         //Load files synchronously
  writable: false,     //Check writability during load to mitigate issues later
  reload: false,       //Reload config if cached
  defaults: {},        //Configuration defaults to be overridden
  parse: JSON5.parse,  //Functions to override the default file format
  stringify: data => JSON5.stringify(data, null, 2)
} 
```

Notes on the above options:
* The default loading/saving format is JSON5, as shown.
* Though write checking is performed, writing over config files is not yet implemented because doing so intelligently is difficult (TODO).
* The module caches config objects by resolved path, in a possible crisis of identity wherein it wants really badly to be like `require()`.

<h2 align="center">Querying Configuration</h2>

Of course, I could not be content with loading directory structures into objects. I had to make querying deep into those objects look pretty. The `config` objects returned in the previous examples are config objects with Proxy wrappers that enable the use of a query string syntax in the place of normal property access.

If you were to load a config file `app.json5` with the contents:

```js
{
  a: {
    b: 'value'
  }
}
```

You would then access that with:

```js
config['a.b']
```

And, waylaid like Monty Python and the Holy Grail, the docs end here.