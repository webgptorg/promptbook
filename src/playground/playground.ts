#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import colors from 'colors';
import { join } from 'path';
import { promptbookFetch } from '../scrapers/_common/utils/promptbookFetch';

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

    // const url= 'https://google.com';
    // const url = 'https://pavolhejny.com';
    // const url = 'https://www.pavolhejny.com';
    // const url = 'https://foo.pavolhejny.com';

    const url = 'https://www.stanislavvavrik.cz';

    const response = await promptbookFetch(url);
    const text = await response.text();
    console.log(text);

    //========================================/
}

/**
 * Note: [⚫] Code in this file should never be published in any package
 */
