#!/usr/bin/env node

const { DynamoDB } = require('aws-sdk');
const DynamoTools = require('./dynamo-tools');

const regions = ['us-west-2'];
const clients = regions.reduce((acc, region) => {
  acc[region] = new DynamoDB({
    accessKeyId: 'fakeKeyId',
    secretAccessKey: 'fakeSecretAccessKey',
    endpoint: 'http://localhost:4566',
    region
  });
  return acc;
}, {});

const tools = new DynamoTools({ clients, regions });
// eslint-disable-next-line no-console
tools.createTables().catch(console.error);
