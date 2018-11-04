
import * as handlebars from 'handlebars';
import * as _ from 'lodash';
import * as path from 'path';
import { logger } from './utilities/logger';
import { FILENAMES } from './constants/file-names';
const fs = require('fs-extra');
const npmRun = require('npm-run');
const projectPath = process.cwd();
logger.info('Generating TSLint report for project in ' + projectPath);
export class ReportGenerator {

    constructor() {
        this.checkForAngularProject();
    }
    /**
     * Method to check whether user trying to create TSLint report for angular2+ application
     */
    private checkForAngularProject() {
        const angularProjectPath = projectPath + '/' + FILENAMES.angularProject;
        // check for angular.json file
        fs.pathExists(angularProjectPath)
            .then((angularFileExists: boolean) => {
                if (!angularFileExists) {
                    logger.error('Please use ngx-tslint-report for Angular2 application');
                } else {
                    logger.info('Running inside angular application');
                    this.checkForTslintReportConfig(); // check for lint report config
                }
            })
            .catch(err => {
                logger.error('Please use ngx-tslint-report for Angular2 application');
            });
    }

    /**
     * Method to check whether tslint report exists
     */
    private checkForTslintReportConfig() {
        const tslintReportConfig = projectPath + '/' + FILENAMES.tslintReportConfig;
        // check for tslint-report-config.json file
        fs.pathExists(tslintReportConfig)
            .then((tslintReportConfigExists: boolean) => {
                if (!tslintReportConfigExists) {
                    logger.debug('TS lint report config doesn\'t exists');
                    this.copyTslintReportConfig(); // copy the default tslint report config to the project
                } else {
                    // logger.info('Running inside angular application');
                    this.readTslintReportConfig();
                }
            })
            .catch(err => {
                logger.error('Unable to find/create TS lint report config');
            });
    }
    /**
     * Method to copy the tslint-report config to the project folder
     */
    private copyTslintReportConfig() {
        logger.debug('Copying default tslint report config');
        const tslintConfigSrc = path.join(__dirname, 'config', FILENAMES.tslintReportConfig);
        const tslintConfigDes = path.join(projectPath, FILENAMES.tslintReportConfig);
        fs.copy(tslintConfigSrc, tslintConfigDes)
            .then(() => {
                logger.info('Copied default config');
                this.readTslintReportConfig();
            })
            .catch(err => {
                logger.error(err);
                logger.error('Unable to find/create TS lint report config');
            });
    }

    /**
     * Method to read the copied tslint-report config
     */
    private readTslintReportConfig() {
        const tslintReportConfigFile = path.join(projectPath, FILENAMES.tslintReportConfig);
        const tslintCommandParams = '';
        fs.readJson(tslintReportConfigFile)
            .then(tslintReportConfig => {
                const tslintCommandToRun = this.buildTslintParams(tslintReportConfig);
                this.executeTslintScript(tslintCommandToRun);
            })
            .catch(err => {
                console.error(err)
            })
    }

    /**
     * Method to construct the tslint params
     * @param tslintReportConfig - TSLint report config
     */
    private buildTslintParams(tslintReportConfig: any): string {
        const tslintParams = `tslint -c ${tslintReportConfig.tslint} -t json -o ${tslintReportConfig.ngxtslintjson} -p ${tslintReportConfig.tsconfig} --force`;
        return tslintParams;
    }

    /**
     * Method to start the tslint script in the folder
     * @param tslintCommandToRun - exact tslint command that has to be executed
     */
    private executeTslintScript(tslintCommandToRun: string) {
        npmRun.exec(tslintCommandToRun, { cwd: projectPath },
            (err, stdout, stderr) => {
                // err Error or null if there was no error
                // stdout Buffer|String
                // stderr Buffer|String
                if (err) {
                    logger.error(err);
                }
            });
    }

}

const reportGenerator = new ReportGenerator();

export default reportGenerator;
