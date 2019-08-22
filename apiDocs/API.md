# API

This documentation contains information about warehouse.ai's API.

For a complete list of existing routes in `warehouse.ai`, their parameters, and their requirements, please refer to the API documentation [here][api-docs].

In addition, to make it easier to interact with `warehouse.ai`, we provide an [API client][api-client] for `warehouse.ai`. It has interfaces such as a [build interface][build], which allows users to trigger and promote builds, an [asset interface][asset], which allows users to get asset information, and other interfaces for the `warehouse.ai`'s API.

For example, the build interface allows users to to get the builds for an environment for a given package:

```js
const Warehouse = require('warehouse.ai-api-client');
const wrhs = new Warehouse('https://warehouse-instance');

// Get build for environment for a given package name
wrhs.builds.get({ env, pkg }, (err, build) => {});
```

[api-client]: https://github.com/warehouseai/warehouse.ai-api-client
[build]: https://github.com/warehouseai/warehouse.ai-api-client/blob/master/builds.js
[asset]: https://github.com/warehouseai/warehouse.ai-api-client/blob/master/assets.js
[api-docs]: wrhs-spec.md