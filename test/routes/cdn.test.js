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

    t.same(JSON.parse(res.payload), {
      fingerprints: [
        '71fbac4eca64da6727d4a9c9cd00e353.gz',
        '574d0c0f86b220913f60ee7aae20ec6a.gz'
      ],
      recommended: [
        '71fbac4eca64da6727d4a9c9cd00e353/main.js',
        '574d0c0f86b220913f60ee7aae20ec6a/main.css'
      ],
      files: [
        {
          url: 'https://cdn-example.com/71fbac4eca64da6727d4a9c9cd00e353/main.js',
          metadata: {
            css: false,
            js: true,
            foo: 'bar'
          }
        },
        {
          url: 'https://cdn-example.com/574d0c0f86b220913f60ee7aae20ec6a/main.css',
          metadata: {
            css: true,
            js: false,
            beep: 'boop'
          }
        }
      ]
    });

    const { Contents: files } = await fastify.s3
      .listObjectsV2({ Bucket: 'warehouse-cdn' })
      .promise();
    const filenames = files.map(({ Key }) => Key);

    const expectedFiles = [
      '71fbac4eca64da6727d4a9c9cd00e353/main.js',
      '574d0c0f86b220913f60ee7aae20ec6a/main.css'
    ];
  
    expectedFiles.forEach(file => {
      t.ok(filenames.includes(file), `${file} should be uploaded to the bucket`);
    });

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

    t.same(payload, {
      fingerprints: [
        '318a308660ba069e74d756cdc854ca52.gz',
        '318a308660ba069e74d756cdc854ca52.gz'
      ],
      recommended: [
        '318a308660ba069e74d756cdc854ca52/main.js',
        '318a308660ba069e74d756cdc854ca52/main.css'
      ],
      files: [
        {
          url: 'https://cdn-example.com/318a308660ba069e74d756cdc854ca52/main.js',
          metadata: {
            css: false,
            js: true,
            foo: 'bar'
          }
        },
        {
          url: 'https://cdn-example.com/318a308660ba069e74d756cdc854ca52/main.css',
          metadata: {
            css: true,
            js: false,
            beep: 'boop'
          }
        }
      ]
    });

    const { Contents: files } = await fastify.s3
      .listObjectsV2({ Bucket: 'warehouse-cdn' })
      .promise();
    const filenames = files.map(({ Key }) => Key);
    const expectedFiles = [
      '318a308660ba069e74d756cdc854ca52/main.js',
      '318a308660ba069e74d756cdc854ca52/main.css'
    ];

    expectedFiles.forEach(file => {
      t.ok(filenames.includes(file), `${file} should be uploaded to the bucket`);
    });

    t.end();
  });
});
