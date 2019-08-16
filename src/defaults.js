// note minifier types (uglify, terser) will be added to this
// as empty objects below
const DEFAULTS = {
  code: null,
  gzipSize: {level: 9},
  shared: {},
  mode: 'optimal',
  passes: 2,
  log: null
};

module.exports = DEFAULTS;
