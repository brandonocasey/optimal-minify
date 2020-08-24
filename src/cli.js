#! /usr/bin/env node

/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const optimalMinify = require('./index.js');
const DEFAULTS = require('./defaults.js');
const {version} = require('../package.json');
const minifiers = require('./minifiers.js');
const compressors = require('./compressors.js');
const printResults = require('./print-results.js');
const {performance} = require('perf_hooks');

const showHelp = function() {
  console.log(`
  optimal-minify [file] --config <file>
  echo "some code" | optimal-minify --config <file>

  -m, --minifiers   <min,min>     Minifiers to use. Default: ${DEFAULTS.minifiers.join(', ')}. Valid: ${Object.keys(minifiers).join(', ')}
  -c, --compressors <comp,comp>   Compressors to use. Default ${DEFAULTS.compressors.join(', ')}. Valid: ${Object.keys(compressors).join(', ')}
  -p, --passes      <number>      Passes to try for minifiers: Default: ${DEFAULTS.passes}
  -o, --output      <file>        Write the best output to file instead of stdout.
      --no-output                 Do not print output to stdout or write to file. implies verbose
  -v, --version                   Print version and exit
  -V, --verbose                   log verbose information to stderr
  -h, --help                      Print help and exit
      --comments <string>         Comments value from uglify/terser config. Deaults to ${DEFAULTS.comments}
      --config                    pass a js/json config to load runs from, instead of cli options.
`);
};

const parseArgs = function(args) {
  const options = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if ((/^--minifiers|-m$/).test(arg)) {
      i++;
      options.minifiers = []
        .concat(options.minifiers || [])
        .concat(args[i].split(','));
    } else if ((/^--compressors|-c$/).test(arg)) {
      i++;
      options.compressors = []
        .concat(options.compressors || [])
        .concat(args[i].split(','));
    } else if ((/^--verbose|-V$/).test(arg)) {
      options.verbose = true;
    } else if ((/^--no-output$/).test(arg)) {
      options.output = false;
      options.verbose = true;
    } else if ((/^--version|-v$/).test(arg)) {
      console.log(`optimal-minify v${version}`);
      process.exit(0);
    } else if ((/^--help|-h$/).test(arg)) {
      showHelp();
      process.exit(0);
    } else if ((/^--passes|-p$/).test(arg)) {
      i++;
      options.passes = Number(args[i]);
    } else if ((/^--config|-c$/).test(arg)) {
      i++;
      options.config = args[i];
    } else if ((/^--output|-o$/).test(arg)) {
      i++;
      options.output = args[i];
    } else if ((/^--comments$/).test(arg)) {
      i++;
      options.comments = args[i];
    } else {
      options.file = arg;
    }
  }

  return options;
};

const cli = function(code) {
  const options = Object.assign(DEFAULTS, parseArgs(process.argv.slice(2)));

  let output = true;
  let verbose = () => {};

  if (options.verbose) {
    verbose = console.error;
    delete options.verbose;
  }

  if (typeof options.output !== 'undefined') {
    output = options.output;
    delete options.output;
  }

  if (code) {
    options.code = code;
  } else if (options.file) {
    options.code = fs.readFileSync(options.file, 'utf8');
    delete options.file;
  }

  if (!options.code) {
    console.error('You must pass a file or pipe code to be minified!');
    process.exit(1);
  }

  const startTime = performance.now();

  return optimalMinify(options).then(function(results) {
    if (typeof output === 'string') {
      fs.writeFileSync(path.resolve(process.cwd(), output), results[0].code);
    } else if (output !== false) {
      console.log(results[0].code);
    }

    printResults(verbose, results);
    const runTime = ((performance.now() - startTime).toFixed(0) / 1000);

    verbose(`Finished in: ${runTime}s`);

    process.exit(0);
  }).catch(function(e) {
    console.error(e);
    process.exit(1);
  });
};

// no stdin
if (process.stdin.isTTY) {
  cli();

// stdin
} else {
  let code = '';

  // read from stdin, aka piped input
  process.stdin.setEncoding('utf8');
  process.stdin.on('readable', () => {
    let chunk;

    // Use a loop to make sure we read all available data.
    while ((chunk = process.stdin.read()) !== null) {
      code += chunk;
    }
  });

  process.stdin.on('end', () => {
    cli(code);
  });

}
