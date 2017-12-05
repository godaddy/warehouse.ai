const auth = require('basic-auth');

module.exports = function authorize(app) {
  const credentials = app.config.get('auth');
  if (!credentials) return ((req, res, next) => next(null));
  const user = credentials.user;
  const password = credentials.password;

  return (req, res, next) => {
    const creds = auth(req);

    if (!creds || creds.name !== user || creds.pass !== password) {
      return res.status(401).json({ error: 'Not authorized' });
    }

    next();
  }
};

module.exports = authorize;
