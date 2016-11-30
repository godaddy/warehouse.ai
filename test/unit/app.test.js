'use strict';

var assume = require('assume'),
    registry = require('../../lib');

var App = registry.App;

describe('App (unit)', function () {
  var app;

  beforeEach(function () {
    app = new App(__dirname);
  });

  it('has basic properties', function () {
    assume(app.npmProxy).is.a('function');
    assume(app.httpProxy).is.an('object');
  });
});
