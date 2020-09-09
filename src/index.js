const _compressors = require('./compressors.js');
const minifiers = require('./minifiers');
const cloneDeep = require('lodash.clonedeep');
const {performance} = require('perf_hooks');
const DEFAULTS = require('./defaults.js');

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
 * @param {string[]} compressors
 *        A string array of compressors to use
 *
 * @param {Object} run
 *        run options, see optimalMinify function
 *
 * @return {Promise}
 *         A single promise that resolves to a minification result
 */
const doRun = function(_code, compressors, {minifier, options = {}}) {
  const minStart = performance.now();

  return Promise.resolve().then(function() {
    if (!minifier || Object.keys(minifiers).indexOf(minifier) === -1) {
      return Promise.reject('is missing or using an invalid minifier key!\n' +
        `Valid Minifiers are: ${Object.keys(minifiers).join(', ')}`);
    }

    return Promise.resolve(minifiers[minifier](_code, cloneDeep(options)));
  }).then(function({code, error}) {
    const minTime = performance.now() - minStart;

    if (error) {
      return Promise.reject(`${minifier} error\n` + error);
    }
    const results = [];

    compressors.forEach(function(compressor) {
      if (!compressor || Object.keys(_compressors).indexOf(compressor) === -1) {
        return Promise.reject('is missing or using an invalid compressor key!\n' +
          `Valid Compresssors are: ${Object.keys(_compressors).join(', ')}`);
      }
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
 * Run multiple minification tests based on `code` based on the
 * `runs` given.
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
 * @param {string} options.runs[].options
 *        minifier options
 *
 * @param {string} options.config
 *        A config to load runs from, takes priority over run generation
 *
 * @param {string[]} options.compressors
 *        an array of compressors to use.
 *
 * @param {string[]} options.minifiers
 *        an array of minifiers to use. will be ignored if runs or config is specified.
 *
 * @param {number} options.passes
 *        number of passes to try an used. will be ignored if runs or config is specified.
 *
 * @param {string} options.comments
 *        comments option to pass to minifiers. will be ignored if runs or config is specified.
 *
 * @return {Promise}
 *          A promise that resolves to a CompressionResult
 *          containing sorted `results`. Where the index 0 result will be the best.
 *
 */
const optimalMinify = function(options) {
  return Promise.resolve().then(function() {
    options = Object.assign({}, DEFAULTS, options);

    if (!options.code) {
      return Promise.reject('code must be passed to optimalMinify!');
    }

    if (!Array.isArray(options.compressors) || !options.compressors.length) {
      return Promise.reject('compressors must be passed to optimalMinify!');
    }

    if (!Array.isArray(options.runs) || !options.runs.length) {
      if (options.config) {
        options.runs = require(options.config);
      } else {
        const shared = {};

        if (options.comments) {
          shared.output = {comments: options.comments};
          delete options.comments;
        }
        options.runs = [];
        options.minifiers.forEach(function(minifier) {
          let i = options.passes;

          while (i--) {
            options.runs.push({minifier, options: {
              output: shared.output,
              compress: {passes: i + 1}
            }});
          }
        });
      }

    }

    if (!Array.isArray(options.runs) || !options.runs.length) {
      return Promise.reject('Could not determine runs. Pass "runs" in as an array option, \n' +
        'a combination of "minifiers", "compressors", "passes", and "comments"\n' +
        'to generate runs, or a config file that contains runs');
    }

    // validate and clone runs
    return Promise.all(options.runs.map(function(run, i) {
      return doRun(options.code, options.compressors, run).catch(function(e) {
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
