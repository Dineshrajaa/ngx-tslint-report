'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var path = require('path');

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
var projectPath = path.join(__dirname, '..', '..', '..');
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
        })["catch"](function (err) {
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
        })["catch"](function (err) {
            logger.error('Unable to find/create TS lint report config');
        });
    };
    ReportGenerator.prototype.copyTslintReportConfig = function () {
        logger.debug('Copying default tslint report config');
        var tslintConfigSrc = path.join(__dirname, 'config', FILENAMES.tslintReportConfig);
        var tslintConfigDes = projectPath + '/' + FILENAMES.tslintReportConfig;
        fs.copy(tslintConfigSrc, tslintConfigDes)
            .then(function () {
            logger.info('Copied default config');
        })["catch"](function (err) {
            logger.error(err);
            logger.error('Unable to find/create TS lint report config');
        });
    };
    return ReportGenerator;
}());
var reportGenerator = new ReportGenerator();

exports.ReportGenerator = ReportGenerator;
