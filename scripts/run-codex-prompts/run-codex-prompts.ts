#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import colors from 'colors';
import { basename, join } from 'path';
import { assertsError } from '../../src/errors/assertsError';
import { runCodexPrompts } from './main/runCodexPrompts';

if (process.cwd() !== join(__dirname, '../..')) {
    console.error(colors.red('CWD must be root of the project'));
    process.exit(1);
}

runCodexPrompts()
    .catch((error) => {
        assertsError(error);
        console.error(colors.bgRed(`${error.name} in ${basename(__filename)}`));
        console.error(colors.red(error.stack || error.message));
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

/**
 * @deprecated Use `toPosixPath` from `./common/runGoScript/toPosixPath` instead
 */
export { toPosixPath } from './common/runGoScript/toPosixPath';

/**
 * TODO: !!!!! Remake using commander `import commander from 'commander';`
 * Note: [?] Code in this file should never be published in any package
 */
