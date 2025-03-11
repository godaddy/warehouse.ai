/* eslint-disable no-shadow */

const { promises: fs } = require('fs');
const path = require('path');
const { test } = require('tap');
const { build } = require('../helper');

test('CDN API', async (t) => {
  const fastify = build(t);

  t.plan(2);

  t.test('upload assets', async (t) => {
    const tarball = await fs.readFile(
      path.join(__dirname, '..', 'fixtures', 'files', 'my-tarball.tgz')
    );

    const res = await fastify.inject({
      method: 'POST',
      url: '/cdn',
      payload: tarball
    });

    t.equal(res.statusCode, 201);

    const payload = JSON.parse(res.payload);

    t.ok(Array.isArray(payload.fingerprints), 'Fingerprints should be an array');
    t.ok(payload.fingerprints.every((f) => /^[a-z0-9]+\.gz$/.test(f)), 'Every fingerprint should be an alphanumeric string followed by .gz');

    t.ok(Array.isArray(payload.recommended), 'Recommended should be an array');
    t.ok(
      payload.recommended.every(
        (f) => /^[a-z0-9]+\/main\.(js|css)$/.test(f)
      ),
      'Every recommended should be a fingerprint string followed by /main.js or /main.css'
    );

    t.ok(payload.files.every(file => /https:\/\/cdn-example\.com\/.*\/main\.(js|css)$/.test(file.url)), 'All file URLs should match the expected pattern');

    const { Contents: files } = await fastify.s3
      .listObjectsV2({ Bucket: 'warehouse-cdn' })
      .promise();
    const filenames = files.map(({ Key }) => Key);
    t.ok(filenames.every(name => /.*\/main\.(js|css)$/.test(name)), 'All filenames should match the expected pattern');

    t.end();
  });

  t.test('upload assets with single fingerprint', async (t) => {
    const tarball = await fs.readFile(
      path.join(__dirname, '..', 'fixtures', 'files', 'my-tarball.tgz')
    );

    const res = await fastify.inject({
      method: 'POST',
      url: '/cdn',
      payload: tarball,
      query: {
        use_single_fingerprint: true
      }
    });

    t.equal(res.statusCode, 201);

    const payload = JSON.parse(res.payload);

    const payloadFiles = payload.files.map(file => file.url);

    // file url is in format https://cdn-example.com/fingerPrintId0/main.js,
    // capture the fingerPrintId0 by taking second last element of the url from the first file
    const fingerPrintId0 = payloadFiles[0].split('/').splice(-2, 1)[0];

    const regex = new RegExp(`https://cdn-example\\.com/${fingerPrintId0}/main\\.(js|css)$`);
    t.ok(payloadFiles.every(file => regex.test(file)), 'All file URLs should match the expected pattern keeping the same fingerprint id');

    const { Contents: files } = await fastify.s3
      .listObjectsV2({ Bucket: 'warehouse-cdn' })
      .promise();
    const filenames = files.map(({ Key }) => Key);
    t.ok(filenames.every(name => /.*\/main\.(js|css)$/.test(name)), 'All filenames should match the expected pattern');

    t.end();
  });
});
