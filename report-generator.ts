import * as fs from 'fs';
import * as handlebars from 'handlebars';
import * as _ from 'lodash';
import * as npmRun from 'npm-run';
import * as path from 'path';
import { logger } from './utilities/logger';

const projectPath = path.join(__dirname, '..', '..');

logger.info(projectPath);