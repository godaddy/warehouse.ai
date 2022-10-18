const NAMESPACE = 'warehouse';

const tables = {
  [`${NAMESPACE}-objects`]: {
    KeySchema: [
      {
        AttributeName: 'keyname',
        KeyType: 'HASH'
      },
      {
        AttributeName: 'env',
        KeyType: 'RANGE'
      }
    ],
    AttributeDefinitions: [
      {
        AttributeName: 'keyname',
        AttributeType: 'S'
      },
      {
        AttributeName: 'env',
        AttributeType: 'S'
      }
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    }
  },
  [`${NAMESPACE}-object-variants`]: {
    KeySchema: [
      {
        AttributeName: 'id',
        KeyType: 'HASH'
      },
      {
        AttributeName: 'variant',
        KeyType: 'RANGE'
      }
    ],
    AttributeDefinitions: [
      {
        AttributeName: 'id',
        AttributeType: 'S'
      },
      {
        AttributeName: 'variant',
        AttributeType: 'S'
      },
      {
        AttributeName: 'keyname',
        AttributeType: 'S'
      },
      {
        AttributeName: 'env',
        AttributeType: 'S'
      }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'keyname-env-index',
        KeySchema: [
          {
            AttributeName: 'keyname',
            KeyType: 'HASH'
          },
          {
            AttributeName: 'env',
            KeyType: 'RANGE'
          }
        ],
        Projection: {
          ProjectionType: 'ALL'
        },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      }
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    }
  },
  [`${NAMESPACE}-object-history`]: {
    KeySchema: [
      {
        AttributeName: 'id',
        KeyType: 'HASH'
      },
      {
        AttributeName: 'timestamp',
        KeyType: 'RANGE'
      }
    ],
    AttributeDefinitions: [
      {
        AttributeName: 'id',
        AttributeType: 'S'
      },
      {
        AttributeName: 'timestamp',
        AttributeType: 'N'
      }
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    }
  },
  [`${NAMESPACE}-envs`]: {
    KeySchema: [
      {
        AttributeName: 'keyname',
        KeyType: 'HASH'
      },
      {
        AttributeName: 'env',
        KeyType: 'RANGE'
      }
    ],
    AttributeDefinitions: [
      {
        AttributeName: 'keyname',
        AttributeType: 'S'
      },
      {
        AttributeName: 'env',
        AttributeType: 'S'
      }
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    }
  },
  [`${NAMESPACE}-env-aliases`]: {
    KeySchema: [
      {
        AttributeName: 'keyname',
        KeyType: 'HASH'
      },
      {
        AttributeName: 'alias',
        KeyType: 'RANGE'
      }
    ],
    AttributeDefinitions: [
      {
        AttributeName: 'keyname',
        AttributeType: 'S'
      },
      {
        AttributeName: 'alias',
        AttributeType: 'S'
      }
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    }
  }
};

module.exports = {
  tables,
  tableNames: Object.keys(tables)
};
