const gzip = require('gzip-size').sync;
const brotli = require('brotli-size').sync;
const none = (code, options) => code.length;

const compressors = {
  gzip,
  brotli,
  none
};

module.exports = compressors;
