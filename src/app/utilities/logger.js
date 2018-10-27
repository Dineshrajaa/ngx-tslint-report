"use strict";
exports.__esModule = true;
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
exports.logger = new Logger();
