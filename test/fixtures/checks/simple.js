'use strict';

/*
 * Check function that ensures that `pkg` and `files` exist
 * in the `buffer`.
 */
module.exports = function (buffer, next) {
  if (!buffer.pkg || !buffer.files) {
    return next(new Error('pkg and files are required.'));
  }

  return next();
};
