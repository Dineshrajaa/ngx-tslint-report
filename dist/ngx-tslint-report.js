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

  var ora = require('ora');
  var Spinner = /** @class */ (function () {
      function Spinner() {
      }
      /**
       * Method to show spinner with a message
       * @param spinnerMessage - Spinner message to be shown
       */
      Spinner.prototype.show = function (spinnerMessage) {
          var loaderOptions = {
              'color': 'magenta',
              'spinner': 'moon',
              'text': spinnerMessage
          };
          this.loaderIndicator = ora(loaderOptions).start();
      };
      /**
       * Method to hider the spinner
       */
      Spinner.prototype.hide = function () {
          this.loaderIndicator.stop();
      };
      return Spinner;
  }());
  var spinner = new Spinner();

  var FILENAMES = {
      'angularProject': 'angular.json',
      'tslintReportConfig': 'tslint-report-config.json',
      'tslintReportTemplate': 'ngx-ts-lint-report-template.hbs',
      'ngxTsLintReportFile': 'index.html'
  };

  var fs = require('fs-extra');
  var _ = require('lodash');
  var npmRun = require('npm-run');
  var handlebars = require('handlebars');
  var portDetector = require('detect-port');
  var projectPath = process.cwd();
  var httpServer = require('http-server');
  var ReportGenerator = /** @class */ (function () {
      function ReportGenerator() {
          this.ngxTslintReportConfig = {};
          this.checkForAngularProject();
      }
      /**
       * Method to check whether user trying to create TSLint report for angular2+ application
       */
      ReportGenerator.prototype.checkForAngularProject = function () {
          var _this = this;
          logger.info('Generating TSLint report for project in ' + projectPath);
          var angularProjectPath = projectPath + '/' + FILENAMES.angularProject;
          // check for angular.json file
          fs.pathExists(angularProjectPath)
              .then(function (angularFileExists) {
              if (!angularFileExists) {
                  logger.error('Please use ngx-tslint-report for Angular2 application');
              }
              else {
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
              else {
                  _this.readTslintReportConfig();
              }
          })
              .catch(function (err) {
              logger.error('Unable to find/create TS lint report config');
          });
      };
      /**
       * Method to copy the tslint-report config to the project folder
       */
      ReportGenerator.prototype.copyTslintReportConfig = function () {
          var _this = this;
          logger.debug('Copying default tslint report config');
          var tslintConfigSrc = join(__dirname, 'config', FILENAMES.tslintReportConfig);
          var tslintConfigDes = join(projectPath, FILENAMES.tslintReportConfig);
          fs.copy(tslintConfigSrc, tslintConfigDes)
              .then(function () {
              logger.info('Copied default config');
              _this.readTslintReportConfig();
          })
              .catch(function (err) {
              logger.error(err);
              logger.error('Unable to find/create TS lint report config');
          });
      };
      /**
       * Method to read the copied tslint-report config
       */
      ReportGenerator.prototype.readTslintReportConfig = function () {
          var _this = this;
          var tslintReportConfigFile = join(projectPath, FILENAMES.tslintReportConfig);
          fs.readJson(tslintReportConfigFile)
              .then(function (tslintReportConfig) {
              _this.ngxTslintReportConfig = tslintReportConfig;
              var ngxTslintReportJsonPath = join(projectPath, tslintReportConfig.reportFolder, tslintReportConfig.ngxtslintjson);
              // this.ngxTslintReportConfig = path.join(projectPath, tslintReportConfig.reportFolder, tslintReportConfig.ngxtslintjson);
              var tslintCommandToRun = _this.buildTslintParams(tslintReportConfig);
              fs.ensureFile(ngxTslintReportJsonPath)
                  .then(function () {
                  _this.executeTslintScript(tslintCommandToRun);
              })
                  .catch(function (err) {
                  logger.error(err);
              });
          })
              .catch(function (err) {
              logger.error(err);
          });
      };
      /**
       * Method to construct the tslint params
       * @param tslintReportConfig - TSLint report config
       */
      ReportGenerator.prototype.buildTslintParams = function (tslintReportConfig) {
          var reportJsonPath = join(projectPath, this.ngxTslintReportConfig.reportFolder, this.ngxTslintReportConfig.ngxtslintjson);
          var tslintParams = "tslint -c " + tslintReportConfig.tslint + " -t json -o '" + reportJsonPath + "' -p " + tslintReportConfig.tsconfig + " --force";
          return tslintParams;
      };
      /**
       * Method to start the tslint script in the folder
       * @param tslintCommandToRun - exact tslint command that has to be executed
       */
      ReportGenerator.prototype.executeTslintScript = function (tslintCommandToRun) {
          var _this = this;
          spinner.show('Analyzing project for TSLint errors');
          npmRun.exec(tslintCommandToRun, { cwd: projectPath }, function (err, stdout, stderr) {
              // err Error or null if there was no error
              // stdout Buffer|String
              // stderr Buffer|String
              if (err) {
                  logger.error(err);
              }
              spinner.hide();
              _this.readTslintReport();
          });
      };
      /**
       * Method to read the generated tslint report
       */
      ReportGenerator.prototype.readTslintReport = function () {
          var _this = this;
          spinner.show('Processing TSLint errors');
          var reportJsonPath = join(projectPath, this.ngxTslintReportConfig.reportFolder, this.ngxTslintReportConfig.ngxtslintjson);
          fs.readJson(reportJsonPath)
              .then(function (tslintReport) {
              spinner.hide();
              _this.processLintErrors(tslintReport);
          })
              .catch(function (err) {
              logger.error(err);
          });
      };
      /**
       * Method to process the TSLint errors and get the count of errors
       * @param tsLintErrors - Tslint error object
       */
      ReportGenerator.prototype.processLintErrors = function (tsLintErrors) {
          /* const gatheredTslintErrors = JSON.stringify(tsLintErrors);
          logger.info(gatheredTslintErrors); */
          var filesAnalyzed = []; // array to hold the file names which are processed
          var fileNameCollection = {};
          _.forEach(tsLintErrors, function (lintError) {
              var isAlreadyErrorReportedInFile = _.includes(filesAnalyzed, lintError.name);
              if (isAlreadyErrorReportedInFile) {
                  fileNameCollection[lintError.name]++;
              }
              else {
                  filesAnalyzed.push(lintError.name);
                  fileNameCollection[lintError.name] = 1;
              }
          });
          var filesCollection = [];
          // let bugIndex = 0;
          Object.keys(fileNameCollection).forEach(function (key) {
              filesCollection.push({
                  // index: bugIndex++,
                  name: key,
                  count: fileNameCollection[key],
                  details: _.filter(tsLintErrors, { name: key })
              });
          });
          this.bindTsLintErrorInfoWithTemplate(filesCollection, tsLintErrors.length);
      };
      /**
       * Method to bind the TSLint error framed with the Handlebars template
       * @param filesCollection - list of files and corresponding errors
       */
      ReportGenerator.prototype.bindTsLintErrorInfoWithTemplate = function (filesCollection, totalTsLintErrorCount) {
          var _this = this;
          var tslintReportData = {};
          tslintReportData['total'] = totalTsLintErrorCount;
          tslintReportData['errors'] = filesCollection;
          spinner.show('Generating Tslint report');
          var ngxTslintHtmlTemplate = fs.readFileSync(join(__dirname, 'templates', FILENAMES.tslintReportTemplate), 'utf8');
          var compiledTemplate = handlebars.compile(ngxTslintHtmlTemplate, {});
          var reportTemplateWithData = compiledTemplate(tslintReportData);
          var finalTsLintReportFormat = join(projectPath, this.ngxTslintReportConfig.reportFolder, FILENAMES.ngxTsLintReportFile);
          fs.outputFile(finalTsLintReportFormat, reportTemplateWithData)
              .then(function () {
              spinner.hide();
              logger.info('Generated Tslint report');
              logger.warn("Total number of Tslint errors found: " + totalTsLintErrorCount);
              _this.isPortAvailable(_this.ngxTslintReportConfig.reportHostPort); // start serving the file
          }).catch(function (err) {
              logger.error(err);
          });
      };
      /**
       * Method to check whether a port is available or not
       * @param portNumber - port number to be analyzed for availability
       */
      ReportGenerator.prototype.isPortAvailable = function (portNumber) {
          var _this = this;
          portDetector(portNumber)
              .then(function (_port) {
              if (portNumber != _port) {
                  portNumber = _port;
              }
              _this.launchNgxTslintReport(portNumber);
          })
              .catch(function (err) {
              console.log(err);
          });
      };
      /**
       * Method to start a local server with the file
       * @param portNumber - port number where report has to be launched
       */
      ReportGenerator.prototype.launchNgxTslintReport = function (portNumber) {
          var ngxTslintReportToShow = join(projectPath, this.ngxTslintReportConfig.reportFolder);
          logger.warn(ngxTslintReportToShow);
          var httpServerCommand = "http-server " + ngxTslintReportToShow + " -p " + portNumber + " -o";
          npmRun.exec(httpServerCommand, { cwd: projectPath }, function (err, stdout, stderr) {
              // err Error or null if there was no error
              // stdout Buffer|String
              // stderr Buffer|String
              if (err) {
                  logger.error(err);
              }
          });
      };
      return ReportGenerator;
  }());
  var reportGenerator = new ReportGenerator();

  exports.ReportGenerator = ReportGenerator;

  return exports;

}({}));
