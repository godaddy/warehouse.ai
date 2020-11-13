#!/usr/bin/env node

/* eslint-disable no-console */

const { bucketNames } = require('./s3-buckets');

class DynamoTools {
  constructor({ client, region }) {
    this._client = client;
    this._region = region;
  }

  async getBucketStatus(bucketName) {
    let status;
    try {
      const { Buckets: buckets } = await this._client.listBuckets().promise();
      const names = buckets.map(({ Name: name }) => name);
      status = names.includes(bucketName) ? 'CREATED' : 'NOT_CREATED';
      console.log(
        `Current status for ${this._region}/${bucketName} is ${status}`
      );
    } catch (error) {
      console.log(`listBuckets - ${error.message}`);
    }
    return status;
  }

  async waitUntilBucketCreated(bucketName) {
    let status = await this.getBucketStatus(bucketName);
    while (status !== 'CREATED') {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      status = await this.getBucketStatus(bucketName);
    }
  }

  async createBucket(bucketName) {
    try {
      console.log(`Creating ${this._region}/${bucketName}`);
      const createBucketParameters = {
        Bucket: bucketName,
        CreateBucketConfiguration: {
          LocationConstraint: this._region
        }
      };
      await this._client.createBucket(createBucketParameters).promise();
    } catch (error) {
      console.error(
        `createBucket ${this._region}/${bucketName} - ${error.message}`
      );
    }
    await this.waitUntilBucketCreated(bucketName);
    console.log(`createBucket ${this._region}/${bucketName} complete`);
  }

  createBuckets() {
    return Promise.all(
      bucketNames.map((name) => {
        return this.createBucket(name);
      })
    );
  }
}

module.exports = DynamoTools;
