#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

// TODO: import { PROMPTBOOK_ENGINE_VERSION } from '@promptbook-local/core';
import colors from 'colors';
import { join } from 'path';

if (process.cwd() !== join(__dirname, '../../..')) {
    console.error(colors.red(`CWD must be root of the project`));
    process.exit(1);
}

playground()
    .catch((error) => {
        console.error(colors.bgRed(error.name || 'NamelessError'));
        console.error(error);
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

async function playground() {
    console.info(`🧸  Agents Playground`);

    // Do here stuff you want to test
    //========================================>

    // Note: [🎠] Do here the stuff and add in `terminals.json`
    // TODO: console.info(PROMPTBOOK_ENGINE_VERSION);

    //========================================/
}

/**
 * Note: [⚫] Code in this file should never be published in any package
 */
