
# Optimal Minify
Find out what minification method is best for your code at runtime and use it.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Install](#install)
- [Why?](#why)
- [CLI Usage](#cli-usage)
- [API Usage](#api-usage)
- [Options](#options)
  - [`minifiers`/`--minifiers`](#minifiers--minifiers)
  - [`compressors`/`--compressors`](#compressors--compressors)
  - [`passes`/`--passes`](#passes--passes)
  - [`comments`/`--comments`](#comments--comments)
  - [`config`/`--config`](#config--config)
  - [`--output`](#--output)
  - [`--no-output`](#--no-output)
  - [`--verbose`](#--verbose)
- [Config or run specification](#config-or-run-specification)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Install
```
npm install optimal-minify
```

## Why?
What spurred this project was an investigation on the performance of two minifiers with a similar origin (uglify and terser). I noticed that some of our code in the videojs organization and internally performed better with uglify or terser but trying to hand configure every project to use either and evaluate the performance was tedious. That's where this project comes in. Not only does it evaluate real performance using `gzip`, or optionally `brotli`, but it also spits out the best result so that you don't event have to worry about it.

## CLI Usage
Optimal Minify provides two binaries that work exactly the same: `optimal-minify` and `optmin`

Using `--help to get option and usage help`
```shell
optimal-minify --help
optmin --help
```

Code can be piped to either binary or passed as a file name.
```shell
cat some-file.js | optmin
optmin some-file.js
```

See [Options](#options), [Config or run specification](#config-or-run-specification), or `--help` for further configuration needs.

## API Usage
```js
const optmin = require('optimal-minify');
const options = {
  code: '<actual-code-here>',
  compressors: ['gzip', 'brotli', 'none']
};

// specify runs directly
options.runs = [
  {minifier: 'uglify', options: {comments: 'some'}},
  {minifier: 'terser', options: {comments: 'some'}},
];

// specify run indirectly via minifiers, passes, and comments
Object.assign(options, {
  minifiers: ['terser', 'uglify'],
  passes: 2,
  comments: 'some'
});

// specify runs via config
options.config = 'config.js';


optmin(options).then(function(results) {
  // results are sorted and the first results will be the smallest
  // if two results are the same size, the fastest of the two will be the
  // first result
  const {minifier, time, bytes, compressor, options} = results[0];

  console.log('Best Run: ', {minifier, time, bytes, compressor, options});
});
```

## Options
> See [src/defaults.js]() for the defaults options.

### `minifiers`/`--minifiers`
An array of minifiers to use. Passed in as a comma separated list on the command line.
> See [src/minifiers.js]() for supported minifiers

### `compressors`/`--compressors`
An array of compressors to use. Passed in as a comma separated list on the command line.
> See [src/compressors.js]() for supported minifiers

### `passes`/`--passes`
The number of passes to test each minifier with. For instance if you pass in `2` then we will test
all minifier and compressors combinations with `2` passes and `1` pass and return the result that gives
the lowest compressed size.

### `comments`/`--comments`
Most code keeps a license comment at the top of the file using a value of `some`. See Uglify/terser options for other values.

### `config`/`--config`
Pass a configuration file in that will be used to seed all minification runs.

### `--output`
A cli only option that can be passed to write output to a file instead of stdout.

### `--no-output`
A cli only option that prevents output from being written anywhere and implies verbos that prevents output from being written anywhere and implies verbose.

### `--verbose`
A Cli only option that writes out results and time taken at the end of a run to stderr.

## Config or run specification
Runs can be specified by the module export of a config file, a json config file, or by using the API and passing in `runs` as an option directly.

Run need to contain the following things:
* A `minifier` property with a string value for a minifier. See [src/minifiers.js]() for a full list.
* An `options` object that will be passed directly to the minifier. Useful for testing different options.

