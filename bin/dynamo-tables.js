const NAMESPACE = 'warehouse';

const tables = {
  [`${NAMESPACE}-objects`]: {
    KeySchema: [
      {
        AttributeName: 'name',
        KeyType: 'HASH'
      },
      {
        AttributeName: 'env',
        KeyType: 'RANGE'
      }
    ],
    AttributeDefinitions: [
      {
        AttributeName: 'name',
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
  }
};

module.exports = {
  tables,
  tableNames: Object.keys(tables),
  regions: ['us-west-2']
};
