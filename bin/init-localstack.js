#!/usr/bin/env node

const { DynamoDB, S3 } = require('aws-sdk');
const DynamoTools = require('./dynamo-tools');
const S3Tools = require('./s3-tools');

const dynamoRegions = ['us-west-2'];

const credentials = {
  accessKeyId: 'fakeKeyId',
  secretAccessKey: 'fakeSecretAccessKey'
};

// eslint-disable-next-line
const endpoint = process.env.LOCALSTACK_URL || 'http://localhost:4566';

const dynamoClients = dynamoRegions.reduce((acc, region) => {
  acc[region] = new DynamoDB({
    endpoint,
    credentials,
    region
  });
  return acc;
}, {});

const dynamoTools = new DynamoTools({
  clients: dynamoClients,
  regions: dynamoRegions
});

const s3Region = 'us-west-2';
const s3Tools = new S3Tools({
  client: new S3({
    endpoint,
    credentials,
    s3ForcePathStyle: true,
    region: s3Region
  }),
  region: s3Region
});

Promise.all([dynamoTools.createTables(), s3Tools.createBuckets()])
  // eslint-disable-next-line no-console
  .then(() => console.info('Localstack initialized'))
  // eslint-disable-next-line no-console
  .catch(console.error);
