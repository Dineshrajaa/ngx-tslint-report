
import * as path from 'path';
import { logger } from './utilities/logger';
import { spinner } from './utilities/spinner';
import { FILENAMES } from './constants/file-names';
const fs = require('fs-extra');
const _ = require('lodash');
const npmRun = require('npm-run');
const handlebars = require('handlebars');
const projectPath = process.cwd();
logger.info('Generating TSLint report for project in ' + projectPath);
export class ReportGenerator {
    ngxTslintReportConfig: any = {};
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
        fs.readJson(tslintReportConfigFile)
            .then(tslintReportConfig => {
                this.ngxTslintReportConfig = tslintReportConfig;
                const ngxTslintReportJsonPath = path.join(projectPath, tslintReportConfig.reportFolder, tslintReportConfig.ngxtslintjson);
                // this.ngxTslintReportConfig = path.join(projectPath, tslintReportConfig.reportFolder, tslintReportConfig.ngxtslintjson);
                const tslintCommandToRun = this.buildTslintParams(tslintReportConfig);
                fs.ensureFile(ngxTslintReportJsonPath)
                    .then(() => {
                        this.executeTslintScript(tslintCommandToRun);
                    })
                    .catch(err => {
                        logger.error(err);
                    });
            })
            .catch(err => {
                logger.error(err);
            });
    }

    /**
     * Method to construct the tslint params
     * @param tslintReportConfig - TSLint report config
     */
    private buildTslintParams(tslintReportConfig: any): string {
        const reportJsonPath = path.join(projectPath, this.ngxTslintReportConfig.reportFolder, this.ngxTslintReportConfig.ngxtslintjson);
        const tslintParams = `tslint -c ${tslintReportConfig.tslint} -t json -o '${reportJsonPath}' -p ${tslintReportConfig.tsconfig} --force`;
        return tslintParams;
    }

    /**
     * Method to start the tslint script in the folder
     * @param tslintCommandToRun - exact tslint command that has to be executed
     */
    private executeTslintScript(tslintCommandToRun: string) {
        spinner.show('Analyzing project for TSLint errors');
        npmRun.exec(tslintCommandToRun, { cwd: projectPath },
            (err, stdout, stderr) => {
                // err Error or null if there was no error
                // stdout Buffer|String
                // stderr Buffer|String
                if (err) {
                    logger.error(err);
                }
                spinner.hide();
                this.readTslintReport();
            });
    }

    /**
     * Method to read the generated tslint report
     */
    private readTslintReport() {
        spinner.show('Processing TSLint errors');
        const reportJsonPath = path.join(projectPath, this.ngxTslintReportConfig.reportFolder, this.ngxTslintReportConfig.ngxtslintjson);
        fs.readJson(reportJsonPath)
            .then(tslintReport => {
                spinner.hide();
                this.processLintErrors(tslintReport);
            })
            .catch(err => {
                logger.error(err);
            });
    }

    /**
     * Method to process the TSLint errors and get the count of errors
     * @param tsLintErrors - Tslint error object
     */
    private processLintErrors(tsLintErrors) {
        /* const gatheredTslintErrors = JSON.stringify(tsLintErrors);
        logger.info(gatheredTslintErrors); */
        const filesAnalyzed = []; // array to hold the file names which are processed
        const fileNameCollection = {};
        _.forEach(tsLintErrors, (lintError) => {
            const isAlreadyErrorReportedInFile = _.includes(filesAnalyzed, lintError.name);
            if (isAlreadyErrorReportedInFile) {
                fileNameCollection[lintError.name]++;
            } else {
                filesAnalyzed.push(lintError.name);
                fileNameCollection[lintError.name] = 1;
            }
        });
        const filesCollection = [];
        // let bugIndex = 0;
        Object.keys(fileNameCollection).forEach((key) => {
            filesCollection.push({
                // index: bugIndex++,
                name: key,
                count: fileNameCollection[key],
                details: _.filter(tsLintErrors, { name: key })
            });
        });
        this.bindTsLintErrorInfoWithTemplate(filesCollection, tsLintErrors.length);
    }

    /**
     * Method to bind the TSLint error framed with the Handlebars template
     * @param filesCollection - list of files and corresponding errors
     */
    private bindTsLintErrorInfoWithTemplate(filesCollection, totalTsLintErrorCount) {
        const tslintReportData = {};
        tslintReportData['total'] = totalTsLintErrorCount;
        tslintReportData['errors'] = filesCollection;
        spinner.show('Generating Tslint report');
        const ngxTslintHtmlTemplate = fs.readFileSync(path.join(__dirname, 'templates', FILENAMES.tslintReportTemplate), 'utf8');
        const compiledTemplate = handlebars.compile(ngxTslintHtmlTemplate, {});
        const reportTemplateWithData = compiledTemplate(tslintReportData);
        const finalTsLintReportFormat = path.join(projectPath, this.ngxTslintReportConfig.reportFolder, FILENAMES.ngxTsLintReportFile);
        fs.outputFile(finalTsLintReportFormat, reportTemplateWithData)
            .then(() => {
                spinner.hide();
                logger.info('Generated Tslint report');
                logger.warn(`Total number of Tslint errors found: ${totalTsLintErrorCount}`);
            }).catch(err => {
                logger.error(err);
            });
    }

}

const reportGenerator = new ReportGenerator();

export default reportGenerator;
