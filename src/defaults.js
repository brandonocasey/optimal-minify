const minifiers = require('./minifiers');
const DEFAULTS = {
  comments: 'some',
  passes: 2,
  minifiers: Object.keys(minifiers),
  compressors: ['gzip']
};

module.exports = DEFAULTS;
