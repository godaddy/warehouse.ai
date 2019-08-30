# Warehouse.ai
Warehouse.ai

## Version: 5.1.4

### /assets/files/{pkg}/{env}

#### GET
##### Summary:

Gets the file assets for a given package-environment-version

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| pkg | path | The package name | Yes | string |
| env | path | The environment | Yes | string |
| filter | query | Case-insensitive substring filter to apply to the file list | No | string |

##### Responses

| Code | Description |
| ---- | ----------- |
| 200 | OK |
| 400 | Filter is too long |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

null

### /assets/files/{pkg}/{env}/{version}

#### GET
##### Summary:

Gets the file assets for a given package-environment-version

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| pkg | path | The package name | Yes | string |
| env | path | The environment | Yes | string |
| version | path | The package version | Yes | string |
| filter | query | Case-insensitive substring filter to apply to the file list | No | string |

##### Responses

| Code | Description |
| ---- | ----------- |
| 200 | OK |
| 400 | Filter is too long |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

null

### /builds/-/head

#### GET
##### Summary:

List the build heads or latest builds

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| name | query | The package name | No | string |
| env | query | The environment | No | string |
| locale | query | The locale (e.g. en-US) | No | string |

##### Responses

| Code | Description |
| ---- | ----------- |
| 200 | OK |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

##### Security

| Security Schema | Scopes |
| --- | --- |
| basicAuth | |

### /builds/-/meta/{pkg}/{version}

#### GET
##### Summary:

Retrieves meta data about a build, including its usage in various environments

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| pkg | path | The package name | Yes | string |
| version | path | The package version | Yes | string |

##### Responses

| Code | Description |
| ---- | ----------- |
| 200 | OK |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

##### Security

| Security Schema | Scopes |
| --- | --- |
| basicAuth | |

### /builds

#### GET
##### Summary:

Retrieves ALL builds

##### Responses

| Code | Description |
| ---- | ----------- |
| 200 | OK |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

##### Security

| Security Schema | Scopes |
| --- | --- |
| basicAuth | |

### /builds/cancel/{pkg}/{version}/{env}

#### GET
##### Summary:

Cancel the specified build.

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| pkg | path | The package name | Yes | string |
| env | path | The environment | Yes | string |
| version | path | The package version | Yes | string |

##### Responses

| Code | Description |
| ---- | ----------- |
| 200 | OK |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

##### Security

| Security Schema | Scopes |
| --- | --- |
| basicAuth | |

### /builds/{pkg}

#### GET
##### Summary:

Gets the builds for a package.

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| pkg | path | The package name | Yes | string |

##### Responses

| Code | Description |
| ---- | ----------- |
| 200 | OK |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

##### Security

| Security Schema | Scopes |
| --- | --- |
| basicAuth | |

#### POST
##### Summary:

Get build the builds for a package.

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| pkg | path | The package name | Yes | string |

##### Responses

| Code | Description |
| ---- | ----------- |
| 200 | OK |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

##### Security

| Security Schema | Scopes |
| --- | --- |
| basicAuth | |

### /builds/{pkg}/{env}

#### GET
##### Summary:

Get the builds for a package & environment.

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| pkg | path | The package name | Yes | string |
| env | path | The environment | Yes | string |

##### Responses

| Code | Description |
| ---- | ----------- |
| 200 | OK |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

##### Security

| Security Schema | Scopes |
| --- | --- |
| basicAuth | |

### /builds/{pkg}/{env}/{version}

#### GET
##### Summary:

Get builds the builds for a package, environment, and version.

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| pkg | path | The package name | Yes | string |
| env | path | The environment | Yes | string |
| version | path | The package version | Yes | string |

##### Responses

| Code | Description |
| ---- | ----------- |
| 200 | OK |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

##### Security

| Security Schema | Scopes |
| --- | --- |
| basicAuth | |

#### PATCH
##### Summary:

Run a build with an optional promotion.

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| pkg | path | The package name | Yes | string |
| env | path | The environment | Yes | string |
| version | path | The package version | Yes | string |
| promote | query | true if a promotion should happen on successful build | No | boolean |

##### Responses

| Code | Description |
| ---- | ----------- |
| 204 | Success |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

##### Security

| Security Schema | Scopes |
| --- | --- |
| basicAuth | |

### /healthcheck

#### GET
##### Summary:

Healthcheck endpoint to verify that service is running and able to accept new connections

##### Responses

| Code | Description |
| ---- | ----------- |
| 200 | OK |
| 500 | Internal Server Error |

null

### /packages/search

#### GET
##### Summary:

Returns the packages matching the query string parameters

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| type | query | The type to search for | No | string |

##### Responses

| Code | Description |
| ---- | ----------- |
| 200 | OK |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

##### Security

| Security Schema | Scopes |
| --- | --- |
| basicAuth | |

### /packages

#### GET
##### Summary:

Returns a list of information about all tracked packages

##### Responses

| Code | Description |
| ---- | ----------- |
| 200 | OK |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

##### Security

| Security Schema | Scopes |
| --- | --- |
| basicAuth | |

### /packages/{pkg}

#### GET
##### Summary:

Returns information about the given package

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| pkg | path | The package name | Yes | string |

##### Responses

| Code | Description |
| ---- | ----------- |
| 200 | OK |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

##### Security

| Security Schema | Scopes |
| --- | --- |
| basicAuth | |

### /promote/{pkg}/{env}/{version}

#### PATCH
##### Summary:

Promotes a build

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| pkg | path | The package name | Yes | string |
| env | path | The environment | Yes | string |
| version | path | The package version | Yes | string |

##### Responses

| Code | Description |
| ---- | ----------- |
| 204 | Success |
| 400 | Filter is too long |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

##### Security

| Security Schema | Scopes |
| --- | --- |
| basicAuth | |

### /release-line/{pkg}

#### GET
##### Summary:

Get the release line for a package & environment, uses the version that is currently in that environment

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| pkg | path | The package name | Yes | string |

##### Responses

| Code | Description |
| ---- | ----------- |
| 200 | OK |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

##### Security

| Security Schema | Scopes |
| --- | --- |
| basicAuth | |

### /release-line/{pkg}/{version}

#### GET
##### Summary:

Get the release line for a package, environment, and version

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| pkg | path | The package name | Yes | string |
| version | path | The package version | Yes | string |

##### Responses

| Code | Description |
| ---- | ----------- |
| 200 | OK |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

##### Security

| Security Schema | Scopes |
| --- | --- |
| basicAuth | |

### security

### /{pkg}

#### PUT
##### Summary:

Publish a package but only when verified.

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| pkg | path | The package name | Yes | string |

##### Responses

| Code | Description |
| ---- | ----------- |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

##### Security

| Security Schema | Scopes |
| --- | --- |
| basicAuth | |

#### GET
##### Summary:

Attempts to fetch the `package` and `version` records that have been persisted for this `:pkg`

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| pkg | path | The package name | Yes | string |

##### Responses

| Code | Description |
| ---- | ----------- |
| 200 | OK |
| 304 | Not Modified |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

##### Security

| Security Schema | Scopes |
| --- | --- |
| basicAuth | |

### /{pkg}/-rev/{rev}

#### DELETE
##### Summary:

Unpublish a package but only when it will not have an adverse affect on a build that we care about.

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| pkg | path | The package name | Yes | string |
| rev | path | The package version | Yes | string |

##### Responses

| Code | Description |
| ---- | ----------- |
| 200 | OK |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

##### Security

| Security Schema | Scopes |
| --- | --- |
| basicAuth | |

### /-/package/{pkg}/dist-tags

#### GET
##### Summary:

Lists the dist-tags for a package

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| pkg | path | The package name | Yes | string |

##### Responses

| Code | Description |
| ---- | ----------- |
| 200 | OK |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

##### Security

| Security Schema | Scopes |
| --- | --- |
| basicAuth | |

### /-/package/{pkg}/dist-tags/{tag}

#### DELETE
##### Summary:

Removes a dist-tag for a package

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| pkg | path | The package name | Yes | string |
| tag | path | The dist-tag | Yes | string |

##### Responses

| Code | Description |
| ---- | ----------- |
| 204 | Success |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

##### Security

| Security Schema | Scopes |
| --- | --- |
| basicAuth | |

#### PUT
##### Summary:

Adds a dist-tag for a package

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| pkg | path | The package name | Yes | string |
| tag | path | The dist-tag | Yes | string |

##### Responses

| Code | Description |
| ---- | ----------- |
| 201 | Success |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

##### Security

| Security Schema | Scopes |
| --- | --- |
| basicAuth | |

#### POST
##### Summary:

Adds a dist-tag for a package

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| pkg | path | The package name | Yes | string |
| tag | path | The dist-tag | Yes | string |

##### Responses

| Code | Description |
| ---- | ----------- |
| 201 | Success |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

##### Security

| Security Schema | Scopes |
| --- | --- |
| basicAuth | |

### Models


#### Assets

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| files | [ string ] |  | No |

#### Build

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| env | string |  | No |
| name | string |  | No |
| buildId | string |  | No |
| previousBuildId | string |  | No |
| rollbackBuildIds | object |  | No |
| createDate | dateTime |  | No |
| udpateDate | dateTime |  | No |
| version | string |  | No |
| locale | string |  | No |
| cdnUrl | string (uri) |  | No |
| fingerPrints | [ string ] |  | No |
| artifacts | [ string ] |  | No |
| recommended | [ string ] |  | No |

#### Builds

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| Builds | array |  |  |

#### MetaEnv

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| buildId | string |  | No |
| previousBuildId | string |  | No |
| rollbackBuildIds | object |  | No |
| createDate | dateTime |  | No |
| udpateDate | dateTime |  | No |
| locale | string |  | No |
| cdnUrl | string (uri) |  | No |
| fingerPrints | [ string ] |  | No |
| artifacts | [ string ] |  | No |
| recommended | [ string ] |  | No |

#### Meta

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| name | string |  | No |
| version | string |  | No |
| envs | object |  | No |

#### Package

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| name | string |  | No |
| version | string |  | No |

#### Packages

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| Packages | array |  |  |

#### ReleaseLine

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| pkg | string |  | No |
| version | string |  | No |
| previousVersion | string |  | No |
| dependents | object |  | No |

#### Environment

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| Environment | string |  |  |

#### PackageName

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| PackageName | string |  |  |

#### VersionNumber

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| VersionNumber | string |  |  |

#### Locale

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| Locale | string |  |  |

#### Error

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| Error |  |  |  |

#### DistTags

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| DistTags | object |  |  |