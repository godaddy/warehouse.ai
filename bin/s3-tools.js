#!/usr/bin/env node

/* eslint-disable no-console */

const { HeadBucketCommand, CreateBucketCommand } = require('@aws-sdk/client-s3');
const { bucketNames } = require('./s3-buckets');

/**
 * @typedef {import('@aws-sdk/client-s3').S3Client} AwsS3
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
      await this._client.send(new HeadBucketCommand({ Bucket: bucketName }));
      status = 'CREATED';
      console.log(
        `Current status for ${this._region}/${bucketName} is ${status}`
      );
    } catch (error) {
      if (error instanceof RangeError) {
        // SDK v3 can't parse LocalStack's Date response header on a 200, but the bucket exists
        status = 'CREATED';
      } else {
        status = 'NOT_CREATED';
        const isExpected = error.$metadata?.httpStatusCode === 404 || error.name === 'NotFound';
        if (!isExpected) console.log(`headBucket - ${error.message}`);
      }
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
      await this._client.send(new CreateBucketCommand(createBucketParameters));
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
