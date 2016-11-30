'use strict';

/*
 * Check function always returns the same faliure.
 */
module.exports = function (buffer, next) {
  next(new Error('The bad check is always bad.'));
};
