#! /usr/bin/env node

/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const optimalMinify = require('./index.js');
const DEFAULTS = require('./defaults.js');
const {version} = require('../package.json');
const minifiers = require('./minifiers.js');
const printResults = require('./print-results.js');

const showHelp = function() {
  console.log(`
  optimal-minify [file] --config <file>
  echo "some code" | optimal-minify --config <file>

  -m, --mode    <mode>     Mode to run with: Default: optimal. Others: ${Object.keys(minifiers).join(', ')}
  -p, --passes  <number>   Passes to try for minifiers: Default: 2
  -c, --config  <file>     Config file to use for more advanced minify options
  -o, --output  <file>     Write the best output to file instead of stdout. Pass 'false', to disable
  -v, --version            Print version and exit
  -V, --verbose            log verbose information to stderr
  -h, --help               Print help and exit
      --comments <string>  comments value from uglify/terser

`);
};

const parseArgs = function(args) {
  const options = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if ((/^--mode|-m$/).test(arg)) {
      i++;
      options.mode = args[i];
    } else if ((/^--verbose|-V$/).test(arg)) {
      options.verbose = true;
    } else if ((/^--version|-v$/).test(arg)) {
      console.log(`optimal-minify v${version}`);
      process.exit(0);
    } else if ((/^--help|-h$/).test(arg)) {
      showHelp();
      process.exit(0);
    } else if ((/^--passes|-p$/).test(arg)) {
      i++;
      options.mode = args[i];
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
  let options = Object.assign(DEFAULTS, parseArgs(process.argv));

  if (options.config) {
    const config = JSON.parse(fs.readFileSync(options.config, 'utf8'));

    options = Object.assign(options, config, {
      shared: Object.assign(options.shared || {}, config.shared || {}),
      uglify: Object.assign(options.uglify || {}, config.uglify || {}),
      terser: Object.assign(options.terser || {}, config.terser || {}),
      gzipSize: Object.assign(options.gzipSize || {}, config.gzipSize || {})
    });
    delete options.config;
  }

  if (options.comments) {
    options.shared.output = {comments: options.comments};
    delete options.comments;
  }

  let output;
  let verbose = () => {};

  if (options.verbose) {
    verbose = console.error;
    delete options.verbose;
  }

  if (options.output) {
    output = options.output;
    delete options.output;
  }

  if (code) {
    options.code = code;
  } else if (options.file) {
    options.code = fs.readFileSync(options.file, 'utf8');
    delete options.file;
  }

  return optimalMinify(options).then(function({results, minResult}) {
    if (output) {
      if (output !== 'false') {
        fs.writeFileSync(path.resolve(process.cwd(), output), minResult.code);
      }
    } else {
      console.log(minResult.code);
    }

    printResults(verbose, {results, minResult});

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
