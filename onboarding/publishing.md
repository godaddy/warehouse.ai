# Publishing

This document provides more details on publishing your module to your running instance of [Warehouse.ai] and how to promote it thorugh different environments.

1. [Monitoring build progress](#monitoring-build-progress)
1. [Promoting your module](#promote-your-module-to-testprod)


If you followed steps to set up your module for the [onboarding guide][onboarding], your module should be ready to be published to Warehouse. 
Let's publish your first module to Warehouse!

Publish your package as you normally would:

```sh-session
npm version <newversion> 

npm publish
```

This will trigger a build in Warehouse and publish the module to the `write` endpoint you specified. Initially the build of 
this version will only be available in `DEV`. Subsequently the files are only uploaded to the `DEV` CDN as well. A hash is 
generated from the file content that the browser will use to do caching based on file content. Warehouse provides
various mechanics to [retrieve the build files][build]. 


#### Monitoring build progress

To check the status of the build process you can either use the [Warehouse UI][ui] or
[CLI][cli].
Once you have `Warehouse UI` set up, it will show the
build progress for each environment. Wait for the `DEV` build to complete.

#### Promote your module to TEST/PROD

After the initial publish, the build will only be available in the `DEV` environment. Assuming the bundle
works as expected, it can be promoted to `TEST` and/or `PROD`. Promoting your module's bundle to a specific
environment can be done through `npm dist-tag`. For example, to promote your bundle to `TEST` run:

```
npm dist-tag add [module-name]@[semver] test --registry=https://wherever-you-deployed-warehouse.ai
```

Where `[module-name]` is the package name of your module and `[semver]` the exact semver that was published to
`DEV`. Also be aware that the `--registry` argument is required, since `publishConfig` only applies to `npm publish`.
To promote your module to `PROD`, simply `npm dist-tag` again but replace `test` with `prod`.


[build]: buildOutput.md
[cli]: https://github.com/warehouseai/wrhs/
[onboarding]: onboarding.md
[scoped]: https://docs.npmjs.com/about-scopes
[warehouse.ai]: https://github.com/godaddy/warehouse.ai/
[ui]: https://github.com/godaddy/warehouse.ai-ui