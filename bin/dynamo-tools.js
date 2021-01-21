#!/usr/bin/env node

/* eslint-disable no-console */

const { tables, tableNames } = require('./dynamo-tables');

/**
 * @typedef {import('aws-sdk').DynamoDB} AwsDynamoDB
 * @typedef {Object<string, AwsDynamoDB>} DynamoClients
 * @typedef {AwsDynamoDB.CreateTableInput} DynamoCreateTableParams
 */

/* Class for helping creating DynamoDB tables */
class DynamoTools {
  /**
   * Create a `DynamoTools` instance
   *
   * @param {Object} opts Constructor parameters
   * @param {DynamoClients} opts.clients AWS DynamoDB clients per region
   * @param {string[]} opts.regions AWS regions
   */
  constructor({ clients, regions }) {
    this._clients = clients;
    this._regions = regions;
  }

  /**
   * Return the table status
   *
   * @param {string} region AWS region
   * @param {string} tableName DynamoDB table name
   * @returns {Promise<string>} Bucket status
   */
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

  /**
   * Function that does not resolve until table is created
   *
   * @param {string} region AWS region
   * @param {string} tableName DynamoDB table name
   * @returns {Promise<any>} Operation resolver
   */
  async waitUntilTableCreated(region, tableName) {
    let status = await this.getTableStatus(region, tableName);
    while (status !== 'ACTIVE') {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      status = await this.getTableStatus(region, tableName);
    }
  }

  /**
   * Create application tables in specific AWS region
   *
   * @param {string} region AWS region
   * @param {string} tableName DynamoDB table name
   * @param {DynamoCreateTableParams} createTableParameters Create table AWS SDK parameters
   * @returns {Promise<any>} Operation result
   */
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

  /**
   * Create application tables in specific AWS region
   *
   * @param {string} region AWS region
   * @returns {Promise<any>} Operation result
   */
  createTablesInRegion(region) {
    return Promise.all(
      tableNames.map((tableName) => {
        return this.createTable(region, tableName, tables[tableName]);
      })
    );
  }

  /**
   * Create application tables
   *
   * @returns {Promise<any>} Operation result
   */
  createTables() {
    return Promise.all(
      this._regions.map(async (region) => {
        return this.createTablesInRegion(region);
      })
    );
  }
}

module.exports = DynamoTools;
