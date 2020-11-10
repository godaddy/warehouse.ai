#!/usr/bin/env node

const { DynamoDB } = require('aws-sdk');
const { regions } = require('./dynamo-tables');
const DynamoTools = require('./dynamo-tools');

const clients = regions.reduce((acc, region) => {
  acc[region] = new DynamoDB({
    accessKeyId: 'fakeKeyId',
    secretAccessKey: 'fakeSecretAccessKey',
    endpoint: 'http://localhost:4569',
    region
  });
  return acc;
}, {});

const tools = new DynamoTools(clients);
// eslint-disable-next-line no-console
tools.createTables().catch(console.error);
