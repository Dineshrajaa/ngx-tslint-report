const chalk = require('chalk');
const fancyLogger = require('fancy-log')

enum LOGLEVEL {
    INFO,
    DEBUG,
    WARN,
    ERROR
}

class Logger {
    public logger;
    constructor() {
        this.logger = fancyLogger;
    }

    public info(msg) {
        this.formatAndPrint(LOGLEVEL.INFO, msg);
    }

    private formatAndPrint(logLevel: number, msg: string) {
        let formattedData = msg;
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
    }
}

export let logger = new Logger();