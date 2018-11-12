
import * as path from 'path';
import { logger } from './utilities/logger';
import { spinner } from './utilities/spinner';
import { FILENAMES } from './constants/file-names';
const fs = require('fs-extra');
const _ = require('lodash');
const npmRun = require('npm-run');
const handlebars = require('handlebars');
const portDetector = require('detect-port');
const projectPath = process.cwd();
const httpServer = require('http-server');
export class ReportGenerator {
    ngxTslintReportConfig: any = {};
    constructor() {
        this.checkForAngularProject();
        this.initializIncrementHelper();
        this.initializLengthCheckHelper();
    }

    /**
     * Increment index helper
     */
    private initializIncrementHelper() {
        handlebars.registerHelper("incIndex", (value: string) => {
            return parseInt(value) + 1;
        });
    }

    private initializLengthCheckHelper() {
        handlebars.registerHelper("ifLength", (iterable, sizeExpected, options) => {
            if (iterable.length > sizeExpected) {
                return options.fn(this);
            }
            return options.inverse(this);
        });
    }
    /**
     * Method to check whether user trying to create TSLint report for angular2+ application
     */
    private checkForAngularProject() {
        logger.info('Generating TSLint report for project in ' + projectPath);
        const angularProjectPath = path.join(projectPath, FILENAMES.angularProject);
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
        const tslintReportConfig = path.join(projectPath, FILENAMES.reportFolder, FILENAMES.tslintReportConfig);
        // check for tslint-report-config.json file
        fs.pathExists(tslintReportConfig)
            .then((tslintReportConfigExists: boolean) => {
                if (!tslintReportConfigExists) {
                    logger.debug('TS lint report config doesn\'t exists');
                    this.copyTslintReportConfig(); // copy the default tslint report config to the project
                } else {
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
        const tslintConfigDes = path.join(projectPath, FILENAMES.reportFolder, FILENAMES.tslintReportConfig);
        fs.copy(tslintConfigSrc, tslintConfigDes)
            .then(() => {
                logger.info('Copied default config');
                this.readTslintReportConfig();
            })
            .catch(err => {
                logger.error(err);
                logger.error('Unable to find/create TS lint report config');
                process.exit(1);
            });
    }

    /**
     * Method to read the copied tslint-report config
     */
    private readTslintReportConfig() {
        const tslintReportConfigFile = path.join(projectPath, FILENAMES.reportFolder, FILENAMES.tslintReportConfig);
        fs.readJson(tslintReportConfigFile)
            .then(tslintReportConfig => {
                this.ngxTslintReportConfig = tslintReportConfig;
                const ngxTslintReportJsonPath = path.join(projectPath, FILENAMES.reportFolder, tslintReportConfig.ngxtslintjson);
                const tslintCommandToRun = this.buildTslintParams(tslintReportConfig);
                fs.ensureFile(ngxTslintReportJsonPath)
                    .then(() => {
                        this.executeTslintScript(tslintCommandToRun);
                    })
                    .catch(err => {
                        logger.error(err);
                        process.exit(1);
                    });
            })
            .catch(err => {
                logger.error(err);
                process.exit(1);
            });
    }

    /**
     * Method to construct the tslint params
     * @param tslintReportConfig - TSLint report config
     */
    private buildTslintParams(tslintReportConfig: any): string {
        const reportJsonPath = path.join(projectPath, FILENAMES.reportFolder, this.ngxTslintReportConfig.ngxtslintjson);
        // const pathToExcludeTsLint = tslintReportConfig.exclude.join(' ');
        let excludeGlobList = '';
        // TBD: Inject exclude option once an update released for tslint fixing https://github.com/palantir/tslint/issues/3881
        if (tslintReportConfig.exclude && tslintReportConfig.exclude.length > 0) {
            _.forEach(tslintReportConfig.exclude, (excludeGlob) => {
                const absolutePathToExclude = path.join(projectPath, excludeGlob);
                excludeGlobList += `-e '${absolutePathToExclude}'`;
            });
        }
        const tslintParams = `tslint -c ${tslintReportConfig.tslint} -t json -o ${reportJsonPath} -p ${tslintReportConfig.tsconfig} ${excludeGlobList} --force`;
        return tslintParams;
    }

    /**
     * Method to start the tslint script in the folder
     * @param tslintCommandToRun - exact tslint command that has to be executed
     */
    private executeTslintScript(tslintCommandToRun: string) {
        spinner.show('Analyzing project for TSlint errors');
        npmRun.exec(tslintCommandToRun, { cwd: projectPath },
            (err, stdout, stderr) => {
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
        const reportJsonPath = path.join(projectPath, FILENAMES.reportFolder, this.ngxTslintReportConfig.ngxtslintjson);
        fs.readJson(reportJsonPath)
            .then(tslintReport => {
                spinner.hide();
                this.processLintErrors(tslintReport);
            })
            .catch(err => {
                logger.error(err);
                process.exit(1);
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
            lintError['name'] = lintError['name'].replace(projectPath, '');
        });
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
        Object.keys(fileNameCollection).forEach((key, bugIndex) => {
            filesCollection.push({
                index: bugIndex + 1,
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
        const projectPackageInfo = fs.readFileSync(path.join(projectPath, FILENAMES.packageFile), 'utf8');
        const parsedPackageInfo = JSON.parse(projectPackageInfo);
        const tslintReportData = {};
        tslintReportData['total'] = totalTsLintErrorCount;
        tslintReportData['errors'] = filesCollection;
        tslintReportData['projectName'] = parsedPackageInfo.name;
        spinner.show('Generating Tslint report');
        const ngxTslintHtmlTemplate = fs.readFileSync(path.join(__dirname, 'templates', FILENAMES.tslintReportTemplate), 'utf8');
        const compiledTemplate = handlebars.compile(ngxTslintHtmlTemplate, {});
        const reportTemplateWithData = compiledTemplate(tslintReportData);
        const finalTsLintReportFormat = path.join(projectPath, FILENAMES.reportFolder, FILENAMES.ngxTsLintReportFile);
        fs.outputFile(finalTsLintReportFormat, reportTemplateWithData)
            .then(() => {
                spinner.hide();
                logger.info('Generated Tslint report');
                logger.warn(`Total number of Tslint errors found: ${totalTsLintErrorCount}`);
                this.isPortAvailable(this.ngxTslintReportConfig.reportHostPort);// start serving the file
            }).catch(err => {
                logger.error(err);
                process.exit(1);
            });
    }

    /**
     * Method to check whether a port is available or not
     * @param portNumber - port number to be analyzed for availability
     */
    private isPortAvailable(portNumber: number) {
        portDetector(portNumber)
            .then(_port => {
                if (portNumber != _port) {
                    portNumber = _port;
                }
                this.launchNgxTslintReport(portNumber);
            })
            .catch(err => {
                logger.error(err);
                process.exit(1);
            });
    }

    /**
     * Method to start a local server with the file
     * @param portNumber - port number where report has to be launched
     */
    private launchNgxTslintReport(portNumber: number) {
        const ngxTslintReportToShow = path.join(projectPath, FILENAMES.reportFolder);
        const httpServerCommand = `http-server ${ngxTslintReportToShow} -c10 -p ${portNumber} -o`;
        npmRun.exec(httpServerCommand, { cwd: projectPath },
            (err, stdout, stderr) => {
                if (err) {
                    logger.error(err);
                }
            });
    }

}

const reportGenerator = new ReportGenerator();

export default reportGenerator;
