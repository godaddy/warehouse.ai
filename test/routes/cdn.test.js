/* eslint-disable no-shadow */

const { promises: fs } = require('fs');
const path = require('path');
const { test } = require('tap');
const { build } = require('../helper');

test('CDN API', async (t) => {
  const fastify = build(t);

  t.plan(1);

  t.test('upload assets', async (t) => {
    t.plan(3);

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
    t.same(filenames, [
      '574d0c0f86b220913f60ee7aae20ec6a/main.css',
      '71fbac4eca64da6727d4a9c9cd00e353/main.js'
    ]);
  });
});
