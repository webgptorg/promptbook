#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';
import { chromium } from 'playwright';

dotenv.config({ path: '.env' });

import colors from 'colors';
import { join } from 'path';
import { forEver } from 'waitasecond';

if (process.cwd() !== join(__dirname, '../..')) {
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
    console.info(`🧸  Playground`);

    // Do here stuff you want to test
    //========================================>

    const browserServer = await chromium.launchServer({
        host: '0.0.0.0',
        port: 3000,
        headless: false,
    });

    console.log('REMOTE_BROWSER_URL =', browserServer.wsEndpoint());

    await forEver();

    //========================================/

    console.info(`[ Done 🧸  Playground ]`);
}

/**
 * Note: [⚫] Code in this file should never be published in any package
 */
