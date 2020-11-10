#!/usr/bin/env node

/* eslint-disable no-console */

const { DynamoDB } = require('aws-sdk');
const { tables, tableNames, regions } = require('./dynamo-tables');

const clients = regions.reduce((acc, region) => {
  acc[region] = new DynamoDB({
    accessKeyId: 'fakeKeyId',
    secretAccessKey: 'fakeSecretAccessKey',
    endpoint: 'http://localhost:4569',
    region
  });
  return acc;
}, {});

async function getTableStatus(region, tableName) {
  const client = clients[region];
  let status;
  try {
    const ret = await client.describeTable({ TableName: tableName }).promise();
    status = ret.Table.TableStatus;
    console.log(`Current status for ${region}/${tableName} is ${status}`);
  } catch (error) {
    console.log(`describeTable ${region}/${tableName} - ${error.message}`);
  }
  return status;
}

async function waitUntilTableCreated(region, tableName) {
  let status = await getTableStatus(region, tableName);
  while (status !== 'ACTIVE') {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    status = await getTableStatus(region, tableName);
  }
}

async function createTable(region, tableName, createTableParameters) {
  const client = clients[region];
  try {
    console.log(`Creating ${region}/${tableName}`);
    const params = {
      TableName: tableName,
      ...createTableParameters
    };
    await client.createTable(params).promise();
  } catch (error) {
    console.error(`createTable ${region}/${tableName} - ${error.message}`);
  }
  await waitUntilTableCreated(region, tableName);
  console.log(`createTable ${region}/${tableName} complete`);
}

async function createTablesInRegion(region) {
  await Promise.all(
    tableNames.map((tableName) => {
      return createTable(region, tableName, tables[tableName]);
    })
  );
}

async function createTables() {
  await Promise.all(
    regions.map(async (region) => {
      return createTablesInRegion(region);
    })
  );
}

createTables();
