const _compressors = require('./compressors.js');
const minifiers = require('./minifiers');
const cloneDeep = require('lodash.clonedeep');
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
const doRun = function(_code, {minifier, compressors, options = {}}) {
  return Promise.resolve().then(function() {
    if (!minifier || Object.keys(minifiers).indexOf(minifier) === -1) {
      return Promise.reject('is missing or using an invalid minifier key!\n' +
        `Valid Minifiers are: ${Object.keys(minifiers).join(', ')}`);
    }

    const minStart = performance.now();
    const {code, error} = minifiers[minifier](_code, cloneDeep(options));
    const minTime = performance.now() - minStart;

    if (error) {
      return Promise.reject(`${minifier} error\n` + error);
    }
    const results = [];

    compressors.forEach(function(compressor) {
      const compStart = performance.now();
      const bytes = _compressors[compressor](code);
      const compTime = (performance.now() - compStart);

      results.push({
        code,
        bytes,
        time: ((compTime + minTime).toFixed(0) / 1000),
        compressor,
        minifier,
        options
      });
    });

    return Promise.resolve(results);
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
 * @param {string} options.runs[].compressors
 *        which compressors to use
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

      return doRun(options.code, run).catch(function(e) {
        return Promise.reject(`Run #${i} ${e}`);
      });
    }));
  }).then((results) => {
    return Promise.resolve(results.reduce((acc, v) => acc.concat(v), []).sort(function(a, b) {
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
