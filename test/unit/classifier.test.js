'use strict';

const assume = require('assume');
const Classifier = require('../../lib/classifier');

describe('Classifier', function () {
  const classifier = new Classifier({});

  it('classifier.getChecks must not throw an error when given undefined', function () {
    const res = classifier.getChecks();
    assume(res).is.an('array');
  });
});
