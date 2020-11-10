#!/usr/bin/env node

/* eslint-disable no-console */

const { tables, tableNames } = require('./dynamo-tables');

class DynamoTools {
  constructor({ clients, regions }) {
    this._clients = clients;
    this._regions = regions;
  }

  async getTableStatus(region, tableName) {
    const client = this._clients[region];
    let status;
    try {
      const ret = await client
        .describeTable({ TableName: tableName })
        .promise();
      status = ret.Table.TableStatus;
      console.log(`Current status for ${region}/${tableName} is ${status}`);
    } catch (error) {
      console.log(`describeTable ${region}/${tableName} - ${error.message}`);
    }
    return status;
  }

  async waitUntilTableCreated(region, tableName) {
    let status = await this.getTableStatus(region, tableName);
    while (status !== 'ACTIVE') {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      status = await this.getTableStatus(region, tableName);
    }
  }

  async createTable(region, tableName, createTableParameters) {
    const client = this._clients[region];
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
    await this.waitUntilTableCreated(region, tableName);
    console.log(`createTable ${region}/${tableName} complete`);
  }

  async createTablesInRegion(region) {
    await Promise.all(
      tableNames.map((tableName) => {
        return this.createTable(region, tableName, tables[tableName]);
      })
    );
  }

  async createTables() {
    await Promise.all(
      this._regions.map(async (region) => {
        return this.createTablesInRegion(region);
      })
    );
  }
}

module.exports = DynamoTools;
