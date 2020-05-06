# CHANGELOG

### 6.1.1

- Configure env var to properly override config for dynamo region

### 6.1.0

- [#83] Support configurable `wrhs.autoPromoteOnPublish` value in `package.json`

### 6.0.1

- Allow `DATABASE_REGION` env var to configure dynamo region

### 6.0.0

- [#71] Use DynamoDB based models.
- Use `swagger-jsdoc-deref` rather than a custom implementation of it

### 5.1.4

- [#64] Add retry logic for carpenter build.
- [#61] Add full API documentation
- [#60] Add onboarding guide for setting up a new project with an existing warehouse.ai service
- [#56] Extract diagram tool for other Warehouse.ai modules.
- [#59] Add documentation on what goes into a specific package
- Add proper swagger route for optional path variable `/assets/files` route
- [#57] Update `README.md`
  - Add badges
  - Add `promote` routes
  - Remove inline links
  - Add instructions to run local
- [#54] Generate diagrams
  - Include `canihaz` to optionally install `puppeteer`.
  - Provide script `bin/diagrams` to render `mermaid` diagrams and store snapshots to file
  - Provide npm command to execute above script
  - Reference diagrams in documentation.
- [#53] Give credits for Github templates
- [#52] Default documentation
  - Add: `CONTRIBUTING.md`, `CHANGELOG.md`, `SECURITY.md`
  - update `LICENSE` year
  - add `.github` templates

[#52]: https://github.com/godaddy/warehouse.ai/pull/52
[#53]: https://github.com/godaddy/warehouse.ai/pull/53
[#54]: https://github.com/godaddy/warehouse.ai/pull/54
[#56]: https://github.com/godaddy/warehouse.ai/pull/56
[#57]: https://github.com/godaddy/warehouse.ai/pull/57
[#59]: https://github.com/godaddy/warehouse.ai/pull/59
[#60]: https://github.com/godaddy/warehouse.ai/pull/60
[#61]: https://github.com/godaddy/warehouse.ai/pull/61
[#64]: https://github.com/godaddy/warehouse.ai/pull/64
[#71]: https://github.com/godaddy/warehouse.ai/pull/71
[#83]: https://github.com/godaddy/warehouse.ai/pull/83
