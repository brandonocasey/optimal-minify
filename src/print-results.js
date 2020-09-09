const rpad = (v, size) => (v + ' '.repeat(size - v.length));
const lpad = (v, size) => (' '.repeat(size - v.length) + v);

const printResults = function(logFn, results) {
  const max = {};

  results.forEach(function(options) {
    ['bytes', 'minifier', 'compressor', 'time'].forEach(function(k) {
      let val = options[k];

      if (typeof val !== 'string') {
        val = val.toString ? val.toString() : JSON.stringify(val);
      }

      if (!max[k] || val.length > max[k]) {
        max[k] = val.length;
      }
    });
  });
  results.forEach(function(result, i) {
    const {minifier, time, bytes, compressor, options} = result;
    const larrow = i === 0 ? '->' : '  ';
    const rarrow = i === 0 ? '<-' : '';
    const logLine = `${larrow} ` +
      `${rpad(minifier, max.minifier)}: ` +
      `${lpad(bytes, max.bytes)}b ` +
      `${rpad(compressor, max.compressor)} ` +
      `${rpad(time, max.time)}s ` +
      `${JSON.stringify(options)} ` +
      `${rarrow}`;

    logFn(logLine);
  });
};

module.exports = printResults;
