#!/usr/bin/env ts-node

// Note: [❌] Turning off some global checks for playground file:
// spell-checker: disable
/* eslint-disable */

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import colors from 'colors';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';

if (process.cwd() !== join(__dirname, '../../..')) {
    console.error(
        colors.red(
            spaceTrim(`
                CWD must be root of the project

                Script: _boilerplate.ts
                Current CWD: ${process.cwd()}
                Expected CWD: ${join(__dirname, '../../..')}
            `),
        ),
    );
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

    // Note: [🎠] Do here the stuff and add in `terminals.json`

    //========================================/
}

/** Note: [⚫] Code for permanent playground [_boilerplate](src/playground/permanent/_boilerplate.ts) should never be published in any package */
