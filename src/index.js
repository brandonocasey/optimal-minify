const _gzipSize = require('gzip-size');
const minifiers = require('./minifiers');
const DEFAULTS = require('./defaults');

/**
 * A Compression Result from doMinify.
 *
 * @typedef {Object} CompressionResult
 *
 * @property {number} gzipSize
 *           The gzipSize of the minified code.
 *
 * @property {string} code
 *           The minified code.
 *
 * @property {number} passes
 *           The number of passes that were run
 *
 * @property {string} type
 *           The type of minifier that was run.
 *
 * @property {number} time
 *           The time taken in ms
 */

/**
 * A helper for cloning minify objects between runs
 * so that we don't need something like lodash.deepClone
 *
 * @param {Object} options
 *        minify object to clone
 *
 * @param {Object} [shared]
 *        optional shared minify options to use as a base.
 *
 * @returns {Object}
 *          The cloned, and merged minify options
 */
const cloneMinifyOptions = (options = {}, shared = {}) => Object.assign({}, shared, options, {
  compress: Object.assign({}, shared.compress || {}, options.compress || {}),
  mangle: Object.assign({}, shared.mangle || {}, options.mangle || {}),
  output: Object.assign({}, shared.output || {}, options.output || {})
});

/**
 * Do minify of a certain type, given the code to minify
 * the type of minifiers to use and the options to pass.
 *
 * @param {string} type
 *        The type of minifier to run
 *
 * @param {Object} options
 *        options from optimalMinify
 *
 * @return {Promise}
 *         A single promise that resolves to a minification result
 */
const doMinify = function(type, options) {
  const minOptions = cloneMinifyOptions(options[type]);

  return Promise.resolve().then(function() {
    const startTime = Date.now();
    // clone options
    const {code, error} = minifiers[type](options.code, minOptions);

    if (error) {
      return Promise.reject(`${type} error\n` + error);
    }

    return _gzipSize(code, options.gzipSize).then((gzipSize) => Promise.resolve({
      code,
      type,
      gzipSize,
      time: Date.now() - startTime,
      passes: minOptions.compress.passes || 1
    }));
  });
};

/**
 * Do a minify with a different passes value based on passes
 *
 * @param {string} type
 *        The type of minifier to run
 *
 * @param {Object} options
 *        options from optimalMinify
 *
 * @return {Promise[]}
 *         a promise containing a CompressionResult for each
 *         passes value that was tried.
 */
const doMinifyPasses = function(type, options) {
  const promises = [];
  let passes = options.passes || 1;

  while (passes--) {
    options[type] = cloneMinifyOptions(options[type]);
    options[type].compress.passes = passes + 1;

    promises.push(doMinify(type, options));
  }

  return promises;
};

/**
 * Code to run optimalMinify in its various modes
 *
 * @param {Object} options
 *        See options for optimalMinify function
 *
 * @return {Promise|Promise[]}
 *         Each function returns a promise, or an array of promises.
 */
const modes = {
  optimal(options) {
    return Object.keys(minifiers).reduce((acc, type) => {
      return acc.concat(this[type](options));
    }, []);
  }
};

Object.keys(minifiers).forEach(function(type) {
  modes[type] = (options) => doMinifyPasses(type, options);
});

/**
 *
 * @param {Object} options
 *        Options for optimalMinify
 *
 * @param {string} options.code
 *        code to optimalMinify
 *
 * @param {object} options.gzipSize
 *        options to pass to `gzip-size` node module
 *
 * @param {object} options.shared
 *        shared options that should be passed to every
 *        minifier. Will be overriden by minifier specific
 *        options.
 *
 * @param {Object} options.uglify
 *        Options to uglify when using it, will override options.shared.
 *
 * @param {Object} options.terser
 *        Options to terser when using it, will override options.shared.
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
    // clone options
    options = Object.assign({}, DEFAULTS, options || {});
    options.gzipSize = Object.assign(DEFAULTS.gzipSize, options.gzipSize || {});
    options.shared = Object.assign(DEFAULTS.shared, options.shared || {});

    if (!options.code) {
      return Promise.reject('options.code must be passed to optimalMinify!');
    }

    if (!modes[options.mode]) {
      return Promise.reject(`options.mode must be a valid mode: ${Object.keys(modes).join(', ')}`);
    }

    // clone minify options
    Object.keys(minifiers).forEach(function(type) {
      options[type] = cloneMinifyOptions(options[type], options.shared);
    });
    return Promise.all(modes[options.mode](options));
  }).then((results) => {
    let minResult = {gzipSize: Infinity};

    results.forEach(function(result) {
      const {gzipSize, time} = result;

      if (gzipSize < minResult.gzipSize || gzipSize === minResult.gzipSize && time < minResult.time) {
        minResult = result;
      }
    });

    return Promise.resolve({results, minResult});
  });
};

module.exports = optimalMinify;
