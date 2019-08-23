const printResults = function(logFn, results) {
  results.forEach(function(result, i) {
    const {minifier, time, bytes, compressor, options} = result;
    const larrow = i === 0 ? '->' : '  ';
    const rarrow = i === 0 ? '<-' : '';

    logFn(`${larrow} ${minifier}: ${bytes}b ${compressor} ${time}s ${JSON.stringify(options)} ${rarrow}`);
  });
};

module.exports = printResults;
