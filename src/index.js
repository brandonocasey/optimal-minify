const compressors = require('./compressors.js');
const minifiers = require('./minifiers');
const DEFAULTS = require('./defaults');
const cloneDeep = require('lodash.clonedeep')
const {performance} = require('perf_hooks');

/**
 * A Compression Result from doMinify.
 *
 * @typedef {Object} CompressionResult
 *
 * @property {number} bytes
 *           The compressed size of the minified code.
 *
 * @property {string} code
 *           The minified code.
 *
 * @property {Object} options
 *           Options passed to the minifier to obtain this result.
 *
 * @property {string} minifier
 *           The type of minifier that was run.
 *
 * @property {string} compressor
 *           The type of compressor that was run.
 *
 * @property {number} time
 *           The time taken in s
 */

/**
 * Do a minification and compress run
 *
 * @param {string} _code
 *        The code to minify
 *
 * @param {Object} run
 *        run options, see optimalMinify function
 *
 * @return {Promise}
 *         A single promise that resolves to a minification result
 */
const doRun = function(_code, {minifier, compressor, options = {}}) {
  return Promise.resolve().then(function() {
    const startTime = performance.now();
    // clone options
    const {code, error} = minifiers[minifier](_code, cloneDeep(options));

    if (error) {
      return Promise.reject(`${minifier} error\n` + error);
    }

    const bytes = compressors[compressor](code);

    return Promise.resolve({
      code,
      bytes,
      time: ((performance.now() - startTime).toFixed(0) / 1000),
      compressor,
      minifier,
      options
    });
  });
};

/**
 *
 * @param {Object} options
 *        Options for optimalMinify
 *
 * @param {string} options.code
 *        code to optimalMinify
 *
 * @param {Object[]} options.runs
 *        Runs to check against one another
 *
 * @param {string} options.runs[].minifier
 *        which minifier to use
 *
 * @param {string} options.runs[].compressor
 *        which compressor to use
 *
 * @param {string} options.runs[].options
 *        minifier options
 *
 * @param {string} options
 *
 * @param {string} [options.mode=optimal]
 *        How to run optimalMinify, can be optimal, uglify, or terser.
 *
 * @param {number} options.passes
 *        How many passes to try for each minifier.
 *
 * @returns {Promise}
 *          A promise that resolves to a CompressionResult
 *          containing the `minResult` and all other `results`.
 *          {results: [...], minResult: {..}}`
 *
 */
const optimalMinify = function(options) {
  return Promise.resolve().then(function() {
    if (!options.code) {
      return Promise.reject('options.code must be passed to optimalMinify!');
    }

    if (!Array.isArray(options.runs) || !options.runs.length) {
      return Promise.reject('options.runs must be an array with a least one entry!');
    }

    // validate and clone runs

    return Promise.all(options.runs.map(function(run, i) {
      if (!run.minifier || Object.keys(minifiers).indexOf(run.minifier) === -1) {
        return Promise.reject(`Run #${i} is missing or using an invalid minifier key!\n` +
          `Valid Minifiers are: ${Object.keys(minifiers).join(', ')}`);
      }

      if (!run.compressor || Object.keys(compressors).indexOf(run.compressor) === -1) {
        return Promise.reject(`Run #${i} is missing or using an invalid compressorkey!\n` +
          `Valid Minifiers are: ${Object.keys(compressors).join(', ')}`);
      }

      return doRun(options.code, run);
    }));
  }).then((results) => {
    return Promise.resolve(results.sort(function(a, b) {
      if (b.bytes > a.bytes || (b.bytes === a.bytes && b.time < a.time)) {
        return -1;
      } else if (b.bytes < a.bytes || (b.bytes === a.bytes && b.time > a.time)) {
        return 1;
      }

      return 0;
    }));
  });
};

module.exports = optimalMinify;
