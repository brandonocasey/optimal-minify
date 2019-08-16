const terser = require('terser').minify;
const uglify = require('uglify-js').minify;
/**
 * All minifiers that we test with
 */
const minifiers = {
  uglify,
  terser
};

module.exports = minifiers;
