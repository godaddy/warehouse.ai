# Using build output

This document provids more details on using [`warehouse.ai-api-client`][client] in your application 
to consume the build output of your module.

### Using build output
1. [Inspect your bundle](#inspect-your-bundle)
1. [Serving assets from a web service](#serving-assets-from-a-web-service)

Now that you can promote your module's bundle to each environment, you can start using the bundle.
First, let's inspect the available bundle output. Then, we'll reference the assets from your web application.

### Inspect your bundle

The easiest way to quickly inspect a build and files on CDN is by using the Warehouse CLI. Install the CLI by
following [the directions from the readme][cli].

Now let's inspect your build by running the following command. Replace `[module-name]` with your package name.
This will return bundle and build details for your package in `dev`. Similarly you can inspect your bundle in
`test` and `prod`.

```sh-session
wrhs get:build [module-name] dev
```

### Serving assets from a web service

Use the [Warehouse-client][client] to retrieve bundle information for your webserver's responses. The client
requires the same authentication and endpoint details as provided to the [CLI](#inspect-your-bundle).
Currently, we only have a client available for Node.JS. Usage is straightforward. Install the module as
a `dependency` of your webserver, e.g. `npm install warehouse.ai-api-client`.

Next, setup an instance of the client like below. 

```js
const Warehouse = require('warehouse.ai-api-client');
const warehouse = new Warehouse({
  uri: 'https://wherever-you-deployed-warehouse.ai',
  retry: {
    max: 3000
  }
});
```
If your `warehouse.ai` instance was setup with auth, you will need to add your credentials in 
the `uri` field for the step above. Ideally the `[username]` and `[password]` are stored in a 
secure config, for example by using [whisper.json][whisper].

```js
{
  uri: 'https://[username]:[password]@wherever-you-deployed-warehouse.ai'
  ...
}
```



This client can now be used to get information from bundle `details`. This object will contain properties like
`files` and `fingerprints` (unique hashes). Which enables you to reference the correct CDN assets in your
webserver responses.

```js
warehouse.builds.get({
  env: 'prod',                       // This should match the enviroment your server is running in
  pkg: '[module-name]',              // Replace this with your package's name
  locale: 'en-US'                    // Defaults to `en-US`, but could be any locale you specified as target
}, function done(error, details) {
  console.log(details);              // Will return properties similar to the CLI.
});
```

To make sure that build information is retrieved out-of-band, the client has build in memory and/or file caching
mechanisms. Bundles information will be mostly static between requests. The client will automatically
perform update requests on an interval against Warehouse to retrieve the bundle's latests details.

[cli]: https://github.com/warehouseai/wrhs/
[client]: https://github.com/warehouseai/warehouse.ai-api-client#warehouseai-api-client
[whisper]: https://www.npmjs.com/package/whisper.json