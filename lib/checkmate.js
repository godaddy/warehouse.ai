'use strict';

var failure = require('failure');

/*
 * Kills the process with the specified message
 */
function dieWith(msg) {
  process.send(failure(new Error(msg)));
  process.send({ __checkmate: true });
}

process.on('message', function message(data) {
  if (!data.check) {
    return dieWith('{ check } is required data using `.send()`');
  } else if (!data.payload) {
    return dieWith('{ payload } is required data using `.send()`');
  }

  var check;
  try {
    check = require(data.check);
  } catch (ex) {
    return dieWith(ex.message);
  }

  check(Object.freeze(data.payload), function checked(err) {
    if (err) process.send(failure(err));
    process.send({ __checkmate: true });
  });
});
