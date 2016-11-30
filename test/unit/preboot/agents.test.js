'use strict';

var path = require('path');
var assume = require('assume');
var App = require('../../mocks').App;
var dirs = require('../../helpers').dirs;
var agents = require(path.join(dirs.lib, 'preboots', 'agents'));

var HttpsAgent = require('https').Agent;
var HttpAgent = require('http').Agent;

describe('agents preboot', function () {
  var app;

  beforeEach(function () {
    app = new App();
  });

  it('should expose agents with keepalive true', function (done) {
    agents(app, {}, function (err) {
      assume(err).does.not.exist();
      assume(app.agents).is.an('object');
      Object.keys(app.agents).forEach(key => {
        if (/^https/.test(key)) {
          assume(app.agents[key]).is.instanceof(HttpsAgent);
        } else {
          assume(app.agents[key]).is.instanceof(HttpAgent);
        }
        assume(app.agents[key].keepAlive).to.equal(true);
      });
      done();
    });
  });
});
