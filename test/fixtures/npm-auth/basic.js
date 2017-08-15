'use strict';
exports.createPassportNPMOptions = () => {
  return {
    authenticate(data, done) {
      if (data.name === 'basic_user' &&
        data.password === 'basic_pass') {
        return void done(null, { from: 'basic' });
      }
      const err = new Error('invalid login');
      err.status = 403;
      return void done(err);
    },
    serializeNPMToken(data, done) {
      if (data.name === 'basic_user' &&
        data.password === 'basic_pass') {
        return void done(null, 'basic_token');
      }
      const err = new Error('invalid login');
      err.status = 403;
      return void done(err);
    },
    deserializeNPMToken(data, done) {
      if (data.token === 'basic_token') {
        return void done(null, { from: 'token' });
      }
      const err = new Error('invalid login');
      err.status = 403;
      return void done(err);
    }
  };
};
