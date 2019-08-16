const printResults = function(logFn, {results, minResult}) {
  results.forEach(function(result) {
    const {type, time, passes, gzipSize} = result;
    const larrow = minResult === result ? '->' : '  ';
    const rarrow = minResult === result ? '<-' : '';

    logFn(`${larrow} ${type} ${passes} pass(es): ${gzipSize}b gz ${time}ms ${rarrow}`);
  });
};

module.exports = printResults;
