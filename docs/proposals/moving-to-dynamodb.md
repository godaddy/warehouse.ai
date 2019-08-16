# **Design Change** Moving to [DyanamoDB]

## Motivation

Currently [`warehouse.ai`] is relatively hard to setup and requires persistent
servers running [Cassandra] instances. This design change is an effort to both
ease the setup of new `warehouse.ai` instances and provide some cost-savings
for instance-maintainers. This will be the first step to transform
`warehouse.ai` to more closely align with modern `serverless` style
architecture. In the short-term, we will be specifically targeting [DynamoDB],
but welcome [contributions][contributing] to be able to expand the scope to
meet other data stores.

## Existing instances & data migration

If you have an existing running instance of `warehouse.ai` and have concerns,
we would love to hear from you and help you with any data migration.

## Data Models

The current data models and [Cassandra] table design for `warehouse.ai`
lives in [`warehouse-models`] and [`warehouse.ai-status-models`]. They are
summarized here:

* `build` - Represent an individual build of a package
* `build_file` - Represent an individual file (unit)
* `build_head` - Represent the head build version of an entire package
* `dependent` - A dependency graph where every packaged publish can ensure
that any package that depends on it can be updated
* `dependent_of` - An inverse of `dependent` in order for a dependent package
to see what its parent is
* `release_line` - Represent all the necessary information for a given
package/version to know what needs to be deployed
* `release_line_dep` - Represent all the necessary information for a given
package/version to know what needs to be deployed
* `release_line_head` - Represents the head release-line for a given package.
* `version` - Records of every npm publish of a package to the registry
* `package` - Represent an entire published packaged `package.json` to the
registry
* `package_cache` - Stores the same data as `package`, but forced into a single
partition
* `status` - Generic status information
* `status_head` - Generic status information but just for the latest version
for a given `pkg` and `env`.
* `status_event` - A detailed event for the various stages of a build process
* `status_counter` - A simple distributed counter model that is incremented
when a `locale` build has completed in order to compute progress

These tables should for the most part just migrate into DynamoDB tables without
significant changes. The largest changes will be needing to create our own
composite keys since DynamoDB doesn't support them.

DynamoDB also doesn't support the Cassandra `keyspace` mechanism, so each table
name should get prefixed with `wrhs_` so that it's less likely to conflict with
an existing table name.

The following sections contain the column/attribute mappings for each table.

Legend:

* **(pk)** - partition-key
* **(ck)** - clustering key (Cassandra only)
* **(sk)** - sort key (DynamoDB only)
* **--** - Not in that table

### Build (`build`)

> **Open question:** With how DynamoDB works, should we just make the
partition-key be `name` and set the sort-key to be the `build_id`? You can
range query in DynamoDB based on partial sort keys (it's their guidance for
geo-location to have a sort key something like
`country!region!city!zip!street!houseNumber`). The downside there is all the
builds for a given package would end up in the same partition (which could be
a good thing). Once DynamoDB partitions into distinct nodes, the read/write
allocations are spread out evenly between the partitions.  So we could end up
with a heavy partition that way. We could also just use the `build_id` as the
partition-key at the cost of losing the ability to do range queries for all
locales.

Column                | Cassandra Type        | DynamoDB Type      | Notes
--------------------- | --------------------- | ------------------ | ----------------
key                   | **--**                | String **(pk)**    | `${name}!${env}!${version}`
env                   | text **(pk)**         | String             |
name                  | text **(pk)**         | String             |
version               | text **(pk)**         | String             |
build_id              | text                  | String             | `${name}!${env}!${version}!${locale}`
previous_build_id     | text                  | String             |
rollback_build_ids    | map<text, text>       | Map                |
locale                | text **(ck)**         | String **(sk)**    |
create_date           | timestamp             | String             | `dynamodb`'s createdAt
value                 | text                  | **--**             | Was previously unused
cdn_url               | text                  | String             |
fingerprints          | set<text>             | StringSet          |
artifacts             | set<text>             | StringSet          |
recommended           | set<text>             | StringSet          |

### Build File (`build_file`)

Column                | Cassandra Type        | DynamoDB Type      | Notes
--------------------- | --------------------- | ------------------ | ----------------
fingerprint           | text **(pk)**         | String **(pk)**    |
build_id              | text                  | String             |
url                   | text                  | String             |
create_date           | timestamp             | String             | `dynamodb`'s createdAt
env                   | text                  | String             |
locale                | text                  | String             |
name                  | text                  | String             |
version               | text                  | String             |
extension             | text                  | String             |
source                | blob                  | **--**             | Was previously unused, files are stored in the CDN
sourcemap             | blob                  | **--**             | Was previously unused, files are stored in the CDN
shrinkwrap            | json                  | **--**             | Was previously unused
filename              | text                  | String             |

### Build Head (`build_head`)

Column                | Cassandra Type        | DynamoDB Type      | Notes
--------------------- | --------------------- | ------------------ | ----------------
key                   | **--**                | String **(pk)**    | `$(name)!${env}!${version}`
name                  | text **(pk)**         | String             |
env                   | text **(pk)**         | String             |
build_id              | text                  | String             | `${name}!${env}!${version}!${locale}`
previous_build_id     | text                  | String             |
rollback_build_ids    | map<text, text>       | Map                |
create_date           | timestamp             | String             | `dynamodb`'s createdAt
udpate_date           | timestamp             | String             | `dynamodb`'s updatedAt
version               | text                  | String             |
locale                | text **(ck)**         | String **(sk)**    |
cdn_url               | text                  | String             |
fingerprints          | set<text>             | StringSet          |
artifacts             | set<text>             | StringSet          |
recommended           | set<text>             | StringSet          |

### Dependent (`dependent`)

Column                | Cassandra Type        | DynamoDB Type      | Notes
--------------------- | --------------------- | ------------------ | ----------------
name                  | text **(pk)**         | String **(pk)**    |
dependents            | set<text>             | StringSet          |

### Dependent Of (`dependent_of`)

Column                | Cassandra Type        | DynamoDB Type      | Notes
--------------------- | --------------------- | ------------------ | ----------------
pkg                   | text **(pk)**         | String **(pk)**    |
dependent_of          | text                  | String             |

### Release Line (`release_line`)

Column                | Cassandra Type        | DynamoDB Type      | Notes
--------------------- | --------------------- | ------------------ | ----------------
key                   | **--**                | String **(pk)**    | `${pkg}!${version}`
pkg                   | text **(pk)**         | String             |
version               | text **(pk)**         | String             |
previous_version      | text                  | String             |

### Release Line Dependents (`release_line_dep`)

Column                | Cassandra Type        | DynamoDB Type      | Notes
--------------------- | --------------------- | ------------------ | ----------------
key                   | **--**                | String **(pk)**    | `${pkg}!${version}`
pkg                   | text **(pk)**         | String             |
version               | text **(pk)**         | String             |
previous_version      | text                  | String             |
dependent             | text **(ck)**         | String **(sk)**    |
dependent_version     | text                  | String             |

### Release Line Head (`release_line_head`)

Column                | Cassandra Type        | DynamoDB Type      | Notes
--------------------- | --------------------- | ------------------ | ----------------
pkg                   | text **(pk)**         | String **(pk)**    |
previous_version      | text                  | String             |
version               | text                  | String             |

### Version (`version`)

> **Note:** DynamoDB has a maximum row size of 400KB (including key names), we
_should_ be okay as long as no one is publishing truly large `package.json`
files

Column                | Cassandra Type        | DynamoDB Type      | Notes
--------------------- | --------------------- | ------------------ | ----------------
version_id            | text **(pk)**         | **--**             | Removing this field as we would like to be able range query and get all the versions for a given package name
name                  | text                  | String **(pk)**    |
version               | text                  | String **(sk)**    |
value                 | text                  | String             |

### Package (`package`)

> **Note:** DynamoDB has a maximum row size of 400KB (including key names), we
_should_ be okay as long as no one is publishing truly large `package.json`
files

Column                | Cassandra Type        | DynamoDB Type      | Notes
--------------------- | --------------------- | ------------------ | ----------------
name                  | text **(pk)**         | String             |
version               | text                  | String             |
description           | text                  | String             |
main                  | text                  | String             |
git_head              | text                  | String             |
extended              | json                  | Map                |
keywords              | set<text>             | StringSet          |
bundled_dependencies  | set<text>             | StringSet          |
dist_tags             | map<text, text>       | Map                |
envs                  | map<text, text>       | Map                |
metadata              | map<text, text>       | Map                |
config                | map<text, text>       | Map                |
repository            | map<text, text>       | Map                |
dependencies          | map<text, text>       | Map                |
dev_dependencies      | map<text, text>       | Map                |
peer_dependencies     | map<text, text>       | Map                |
optional_dependencies | map<text, text>       | Map                |

### Package Cache (`package_cache`)

This table existed to solve a particular problem with Cassandra in that table
scans across partitions were particularly costly for performance. DynamoDB
provides a `scan` operation (that is page-able) that can select all rows within
a table. So we should not need this table.

The following locations will need to be updated to reflect this change:
1. `warehouse.ai` for
   1. `/packages/search` to find a package (via LoadingBay & redis).
   1. `/packages` to return _all_ packages.
1. `carpenterd` to search all packages during catchup-build scheduling.

> **Open Question:** Do we want to keep the `/packages/search` route? Is
anything using it? Is it worth the cost of a redis instance and table scans?

> **Open Question:** Do we want to keep `/packages` route as-is? It's needed by
`warehouse.ai-ui`, so we likely can't remove it entirely. Should it be a
paginated API? It's somewhat out of scope, but since we're touching it, it
might make sense to do so now bundled into the same semver-major change. We
could also just remove it entirely and have `warehouse.ai-ui` talk directly to
the datastore rather than routing through `warehouse.ai` and
`warehouse.ai-status-api` for it's data.

Column                | Cassandra Type        | DynamoDB Type      | Notes
--------------------- | --------------------- | ------------------ | ----------------
partitioner           | text **(pk)**         | **--**             | Table won't be migrated
name                  | text **(ck)**         | **--**             | Table won't be migrated

### Status (`status`)

Column                | Cassandra Type        | DynamoDB Type      | Notes
--------------------- | --------------------- | ------------------ | ----------------
key                   | **--**                | String **(pk)**    | `${pkg}!${env}!${version}`
pkg                   | text **(pk)**         | String             |
env                   | text **(pk)**         | String             |
version               | text **(pk)**         | String             |
previous_version      | text                  | String             |
total                 | integer               | Number             |
error                 | boolean               | Boolean            |
create_date           | timestamp             | String             | `dynamodb`'s createdAt
update_date           | timestamp             | String             | `dynamodb`'s updatedAt
complete              | boolean               | Boolean            |

### StatusHead (`status_head`)

Column                | Cassandra Type        | DynamoDB Type      | Notes
--------------------- | --------------------- | ------------------ | ----------------
key                   | **--**                | String **(pk)**    | `${pkg}!${env}`
pkg                   | text **(pk)**         | String             |
env                   | text **(pk)**         | String             |
version               | text                  | String             |
previous_version      | text                  | String             |
total                 | integer               | Number             |
create_date           | timestamp             | String             | `dynamodb`'s createdAt
update_date           | timestamp             | String             | `dynamodb`'s updatedAt

### StatusEvent (`status_event`)

Column                | Cassandra Type        | DynamoDB Type      | Notes
--------------------- | --------------------- | ------------------ | ----------------
key                   | **--**                | String **(pk)**    | `${pkg}!${env}!${version}`
pkg                   | text **(pk)**         | String             |
env                   | text **(pk)**         | String             |
version               | text **(pk)**         | String             |
locale                | text                  | String             |
error                 | boolean               | Boolean            |
message               | text                  | String             |
details               | text                  | String             |
create_date           | timestamp             | String             | `dynamodb`'s createdAt
event_id              | unqiue_timestamp **(ck)** | String **(sk)**    | `dynamodb`'s timeUUID

### StatusCounter (`status_counter`)

Column                | Cassandra Type        | DynamoDB Type      | Notes
--------------------- | --------------------- | ------------------ | ----------------
key                   | **--**                | String **(pk)**    | `${pkg}!${env}!${version}`
pkg                   | text **(pk)**         | String             |
env                   | text **(pk)**         | String             |
version               | text **(pk)**         | String             |
count                 | counter               | Number             |

## Affected modules

The following `warehouse.ai` modules will be affected by this change:

1. [`warehouse-models`]
1. [`@wrhs/release-line`]
1. [`bffs`]
1. [`carpenterd-worker`]
1. [`carpenterd`]
1. [`feedsme`]
1. [`warehouse.ai`]
1. [`warehouse.ai-status-models`]
1. [`warehouse.ai-status-api`]

## Backwards compatibility

There are no plans to provide this change in a backwards compatible way. Each
of the affected modules will published after the change with a new semver-major
version. All interactions with the data-store flow through `warehouse-models`
or `warehouse.ai-status-models`, that should continue to be the case.  We will
strive to keep the API surface mostly compatible, but some changes will be
required (like not having a `package_cache` table, partition keys changing,
etc.).

## Data Modeling

As part of this transition and the move to a more `serverless` style we will
just directly use the [`dynamodb`] library from the models packages rather than
trying to adapt `datastar` to work with dynamodb.

## Future Serverless Considerations

Out of scope for this proposal, but interesting potential future work related
to serverless could include:

1. Changing the messaging architecture
   > Currently `warehouse.ai` uses a combination of direct http calls and NSQ
   > for messaging between components, We should consider moving off that for
   > something like [AWS Step Functions], [Amazon SNS], [Amazon SQS], etc.
1. Builds on demand
   > `carpenterd-worker` could be migrated to an [AWS Lambda] to allow for
   > better scaling for on-demand builds, so you don't need to pay for fully
   > running EC2 instances.

[DynamoDB]: https://aws.amazon.com/dynamodb/
[`warehouse.ai`]: https://github.com/godaddy/warehouse.ai
[contributing]: /blob/master/CONTRIBUTING.md
[`warehouse-models`]: https://github.com/warehouseai/warehouse-models
[`@wrhs/release-line`]: https://github.com/warehouseai/release-line
[`carpenterd`]: https://github.com/godaddy/carpenterd
[`carpenterd-worker`]: https://github.com/godaddy/carpenterd-worker
[`bffs`]: https://github.com/warehouseai/bffs
[`feedsme`]: https://github.com/godaddy/feedsme
[`warehouse.ai-status-models`]: https://github.com/warehouseai/warehouse.ai-status-models
[`warehouse.ai-status-api`]: https://github.com/godaddy/warehouse.ai-status-api
[`datastar`]: https://github.com/godaddy/datastar
[`dynamodb`]: https://github.com/baseprime/dynamodb
[Cassandra]: http://cassandra.apache.org/
[Amazon SNS]: https://aws.amazon.com/sns/
[AWS Step Functions]: https://aws.amazon.com/step-functions/
[Amazon SQS]: https://aws.amazon.com/sqs/
[AWS Lambda]: https://aws.amazon.com/lambda/
