/**
 * @fileOverview Read config options
 * @name config.js
 * @author Tyler Collins
 * @license MIT
 */

import Logger from './logger';

const fs = require('fs');
const minimist = require('minimist');

const DEFAULT_FILE = './.axe-crawler.json';

const DEFAULT_OPTS = {
  depth: 5,
  check: undefined, // undefined => check all
  output: 'reports',
  ignore: '.*',
  whitelist: '.*',
  random: false,
  viewPorts: [
    {
      name: 'mobile',
      width: 360,
      height: 640,
    },
    {
      name: 'tablet_vertical',
      width: 768,
      height: 1024,
    },
    {
      name: 'tablet_horizontal',
      width: 1024,
      height: 768,
    },
    {
      name: 'desktop',
      width: 1440,
      height: 900,
    },
  ],
  verbose: 'error',
};

/**
 * parseViewPortsArg - uses a regex to parse a cmd line argument giving custom
 * viewPorts to be tested
 *
 * @param {string} views value from cmd line option --viewPorts mobile:360x640,
 * tablet:768x1024 for example.
 * @returns {Object[]} array of viewPort objects to be added to globalOptions
 */
function parseViewPortsArg(views) {
  return views.split(',')
    .map((view) => {
      const parser = /(\w+):(\d+)x(\d+)/;
      try {
        const [, name, width, height] = parser.exec(view);
        return {
          name,
          width,
          height,
        };
      } catch (err) {
        throw new Error('Invalid viewports: ', views);
      }
    }).filter(view => view);
}

/**
 * crawlerOpts - combine default options, config file options, and cmd line
 * options into single global options object
 *
 * @export
 * @returns {Object} globalOptions object
 */
export default function crawlerOpts() {
  const argv = minimist(process.argv.slice(2));
  argv.domain = argv._.last();
  delete argv._;
  if (argv.viewPorts) {
    argv.viewPorts = parseViewPortsArg(argv.viewPorts);
    if (argv.viewPorts.length === 0) {
      delete argv.viewPorts;
    }
  }

  let { verbose } = argv;
  if (argv.dryRun) {
    // if dryRun, default to verbose = debug
    verbose = argv.verbose || 'debug';
    argv.check = 0;
  }
  if (argv.quiet) {
    // --quiet overrides all other verbose settings
    verbose = 'quiet';
  }

  const logger = new Logger(verbose);

  if (argv.dryRun) {
    logger.force(`Performing dry run with ${argv.verbose} level logging`);
  }


  const optsFile = argv.configFile || DEFAULT_FILE;
  let jsonOpts = {};
  try {
    jsonOpts = JSON.parse(fs.readFileSync(optsFile));
  } catch (err) {
    if (err.code === 'ENOENT' && err.path === optsFile) {
      logger.error('No config file found');
    } else if (err instanceof SyntaxError) {
      logger.error(`Invalid JSON config file ${optsFile}`);
      logger.error('Ignoring JSON config file...');
    }
  }
  return Object.assign(DEFAULT_OPTS, jsonOpts, argv, { logger, verbose });
}
