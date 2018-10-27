// import * as fs from 'fs-extra';
import * as handlebars from 'handlebars';
import * as _ from 'lodash';
import * as npmRun from 'npm-run';
import * as path from 'path';
import { logger } from './utilities/logger';
import { FILENAMES } from './constants/file-names';
const fs = require('fs-extra');
const projectPath = path.join(__dirname, '..', '..', '..');
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
            .then((angularFileExists) => {
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
            .then((tslintReportConfigExists) => {
                if (!tslintReportConfigExists) {
                    logger.debug('TS lint report config doesn\'t exists');
                    this.copyTslintReportConfig(); // copy the default tslint report config to the project
                } else {
                    // logger.info('Running inside angular application');
                }
            })
            .catch(err => {
                logger.error('Unable to find/create TS lint report config');
            });
    }

    private copyTslintReportConfig() {
        logger.debug('Copying default tslint report config');
        const tslintConfigSrc = path.join(__dirname, 'config', FILENAMES.tslintReportConfig);
        const tslintConfigDes = projectPath + '/' + FILENAMES.tslintReportConfig;
        fs.copy(tslintConfigSrc, tslintConfigDes)
            .then(() => {
                logger.info('Copied default config');
            })
            .catch(err => {
                logger.error(err);
                logger.error('Unable to find/create TS lint report config');
            });
    }

}

const reportGenerator = new ReportGenerator();

export default reportGenerator;
