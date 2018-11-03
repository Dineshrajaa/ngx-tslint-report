#!/usr/bin/env node
var ngxtslintreport = (function (exports) {
  'use strict';

  // Copyright Joyent, Inc. and other Node contributors.
  //
  // Permission is hereby granted, free of charge, to any person obtaining a
  // copy of this software and associated documentation files (the
  // "Software"), to deal in the Software without restriction, including
  // without limitation the rights to use, copy, modify, merge, publish,
  // distribute, sublicense, and/or sell copies of the Software, and to permit
  // persons to whom the Software is furnished to do so, subject to the
  // following conditions:
  //
  // The above copyright notice and this permission notice shall be included
  // in all copies or substantial portions of the Software.
  //
  // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
  // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
  // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
  // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
  // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
  // USE OR OTHER DEALINGS IN THE SOFTWARE.

  // resolves . and .. elements in a path array with directory names there
  // must be no slashes, empty elements, or device names (c:\) in the array
  // (so also no leading and trailing slashes - it does not distinguish
  // relative and absolute paths)
  function normalizeArray(parts, allowAboveRoot) {
    // if the path tries to go above the root, `up` ends up > 0
    var up = 0;
    for (var i = parts.length - 1; i >= 0; i--) {
      var last = parts[i];
      if (last === '.') {
        parts.splice(i, 1);
      } else if (last === '..') {
        parts.splice(i, 1);
        up++;
      } else if (up) {
        parts.splice(i, 1);
        up--;
      }
    }

    // if the path is allowed to go above the root, restore leading ..s
    if (allowAboveRoot) {
      for (; up--; up) {
        parts.unshift('..');
      }
    }

    return parts;
  }

  // path.normalize(path)
  // posix version
  function normalize(path) {
    var isPathAbsolute = isAbsolute(path),
        trailingSlash = substr(path, -1) === '/';

    // Normalize the path
    path = normalizeArray(filter(path.split('/'), function(p) {
      return !!p;
    }), !isPathAbsolute).join('/');

    if (!path && !isPathAbsolute) {
      path = '.';
    }
    if (path && trailingSlash) {
      path += '/';
    }

    return (isPathAbsolute ? '/' : '') + path;
  }
  // posix version
  function isAbsolute(path) {
    return path.charAt(0) === '/';
  }

  // posix version
  function join() {
    var paths = Array.prototype.slice.call(arguments, 0);
    return normalize(filter(paths, function(p, index) {
      if (typeof p !== 'string') {
        throw new TypeError('Arguments to path.join must be strings');
      }
      return p;
    }).join('/'));
  }
  function filter (xs, f) {
      if (xs.filter) return xs.filter(f);
      var res = [];
      for (var i = 0; i < xs.length; i++) {
          if (f(xs[i], i, xs)) res.push(xs[i]);
      }
      return res;
  }

  // String.prototype.substr - negative index don't work in IE8
  var substr = 'ab'.substr(-1) === 'b' ?
      function (str, start, len) { return str.substr(start, len) } :
      function (str, start, len) {
          if (start < 0) start = str.length + start;
          return str.substr(start, len);
      }
  ;

  var chalk = require('chalk');
  var fancyLogger = require('fancy-log');
  var LOGLEVEL;
  (function (LOGLEVEL) {
      LOGLEVEL[LOGLEVEL["INFO"] = 0] = "INFO";
      LOGLEVEL[LOGLEVEL["DEBUG"] = 1] = "DEBUG";
      LOGLEVEL[LOGLEVEL["WARN"] = 2] = "WARN";
      LOGLEVEL[LOGLEVEL["ERROR"] = 3] = "ERROR";
  })(LOGLEVEL || (LOGLEVEL = {}));
  var Logger = /** @class */ (function () {
      function Logger() {
          this.logger = fancyLogger;
      }
      Logger.prototype.info = function (msg) {
          this.formatAndPrint(LOGLEVEL.INFO, msg);
      };
      Logger.prototype.debug = function (msg) {
          this.formatAndPrint(LOGLEVEL.DEBUG, msg);
      };
      Logger.prototype.warn = function (msg) {
          this.formatAndPrint(LOGLEVEL.WARN, msg);
      };
      Logger.prototype.error = function (msg) {
          this.formatAndPrint(LOGLEVEL.ERROR, msg);
      };
      Logger.prototype.formatAndPrint = function (logLevel, msg) {
          var formattedData = msg;
          switch (logLevel) {
              case LOGLEVEL.INFO:
                  formattedData = chalk.green(msg);
                  break;
              case LOGLEVEL.DEBUG:
                  formattedData = chalk.cyan(msg);
                  break;
              case LOGLEVEL.WARN:
                  formattedData = chalk.yellow(msg);
                  break;
              case LOGLEVEL.ERROR:
                  formattedData = chalk.red(msg);
                  break;
          }
          this.logger(formattedData);
      };
      return Logger;
  }());
  var logger = new Logger();

  var FILENAMES = {
      'angularProject': 'angular.json',
      'tslintReportConfig': 'tslint-report-config.json'
  };

  var fs = require('fs-extra');
  // const projectPath = path.join(__dirname, '..', '..', '..');
  var projectPath = process.cwd();
  logger.info('Generating TSLint report for project in ' + projectPath);
  var ReportGenerator = /** @class */ (function () {
      function ReportGenerator() {
          this.checkForAngularProject();
      }
      /**
       * Method to check whether user trying to create TSLint report for angular2+ application
       */
      ReportGenerator.prototype.checkForAngularProject = function () {
          var _this = this;
          var angularProjectPath = projectPath + '/' + FILENAMES.angularProject;
          // check for angular.json file
          fs.pathExists(angularProjectPath)
              .then(function (angularFileExists) {
              if (!angularFileExists) {
                  logger.error('Please use ngx-tslint-report for Angular2 application');
              }
              else {
                  logger.info('Running inside angular application');
                  _this.checkForTslintReportConfig(); // check for lint report config
              }
          })
              .catch(function (err) {
              logger.error('Please use ngx-tslint-report for Angular2 application');
          });
      };
      /**
       * Method to check whether tslint report exists
       */
      ReportGenerator.prototype.checkForTslintReportConfig = function () {
          var _this = this;
          var tslintReportConfig = projectPath + '/' + FILENAMES.tslintReportConfig;
          // check for tslint-report-config.json file
          fs.pathExists(tslintReportConfig)
              .then(function (tslintReportConfigExists) {
              if (!tslintReportConfigExists) {
                  logger.debug('TS lint report config doesn\'t exists');
                  _this.copyTslintReportConfig(); // copy the default tslint report config to the project
              }
          })
              .catch(function (err) {
              logger.error('Unable to find/create TS lint report config');
          });
      };
      ReportGenerator.prototype.copyTslintReportConfig = function () {
          logger.debug('Copying default tslint report config');
          var tslintConfigSrc = join(__dirname, 'config', FILENAMES.tslintReportConfig);
          var tslintConfigDes = projectPath + '/' + FILENAMES.tslintReportConfig;
          fs.copy(tslintConfigSrc, tslintConfigDes)
              .then(function () {
              logger.info('Copied default config');
          })
              .catch(function (err) {
              logger.error(err);
              logger.error('Unable to find/create TS lint report config');
          });
      };
      return ReportGenerator;
  }());
  var reportGenerator = new ReportGenerator();

  exports.ReportGenerator = ReportGenerator;

  return exports;

}({}));
