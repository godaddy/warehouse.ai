#!/usr/bin/env node

/* eslint-disable no-console */

const { bucketNames } = require('./s3-buckets');

/**
 * @typedef {import('aws-sdk').S3} AwsS3
 */

/* Class for helping creating S3 buckets */
class S3Tools {
  /**
   * Create a `S3Tools` instance
   *
   * @param {Object} opts Constructor parameters
   * @param {AwsS3} opts.client AWS S3 client instance
   * @param {string} opts.region AWS region
   */
  constructor({ client, region }) {
    this._client = client;
    this._region = region;
  }

  /**
   * Return the bucket status
   *
   * @param {string} bucketName Bucket name
   * @returns {Promise<string>} Bucket status
   */
  async getBucketStatus(bucketName) {
    let status;
    try {
      await this._client.headBucket({ Bucket: bucketName }).promise();
      status = 'CREATED';
      console.log(
        `Current status for ${this._region}/${bucketName} is ${status}`
      );
    } catch (error) {
      status = 'NOT_CREATED';
      console.log(`headBucket - ${error.message}`);
    }
    return status;
  }

  /**
   * Function that does not resolve until bucket is created
   *
   * @param {string} bucketName Bucket name
   * @returns {Promise<void>} Operation resolver
   */
  async waitUntilBucketCreated(bucketName) {
    let status = await this.getBucketStatus(bucketName);
    while (status !== 'CREATED') {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      status = await this.getBucketStatus(bucketName);
    }
  }

  /**
   * Create a bucket
   * @param {string} bucketName Bucket name
   * @returns {Promise<void>} Operation result
   */
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

  /**
   * Create application buckets
   *
   * @returns {Promise<void>} Operation result
   */
  createBuckets() {
    return Promise.all(
      bucketNames.map((name) => {
        return this.createBucket(name);
      })
    );
  }
}

module.exports = S3Tools;
