#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import colors from 'colors';
import { readFileSync } from 'fs';
import glob from 'glob-promise';
import { join } from 'path';
import type { string_char_emoji } from '../../src/types/typeAliasEmoji';
import { difference } from './utils/difference';
import { EMOJIS, EMOJIS_OF_SINGLE_PICTOGRAM } from './utils/emojis';
import { $shuffleItems } from './utils/shuffleItems';

if (process.cwd() !== join(__dirname, '../..')) {
    console.error(colors.red(`CWD must be root of the project`));
    process.exit(1);
}

findFreshEmojiTag()
    .catch((error) => {
        console.error(colors.bgRed(error.name));
        console.error(error);
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

async function findFreshEmojiTag() {
    console.info(`🤪  Find fresh emoji tag`);

    // Do here stuff you want to test
    //========================================>
    EMOJIS;

    const allFiles = await glob('**/*.{ts,tsx,js,jsx,json,md,txt}', {
        ignore: '**/node_modules/**',
    });

    const usedEmojis = new Set<string_char_emoji>();

    for (const file of allFiles) {
        const content = readFileSync(file, 'utf-8'); /* <- Note: Its OK to use sync in tooling */

        for (const emoji of EMOJIS_OF_SINGLE_PICTOGRAM) {
            const tag = `[${emoji}]`;
            if (content.includes(tag)) {
                usedEmojis.add(emoji);
            }
        }
    }

    const freshEmojis = difference(EMOJIS_OF_SINGLE_PICTOGRAM, usedEmojis);

    console.info(colors.green(`Avialable fresh tags:`));
    for (const emoji of $shuffleItems(...Array.from(freshEmojis)).splice(0, 10)) {
        const tag = `[${emoji}]`;
        console.info(colors.bgWhite(tag));
    }

    //========================================/

    // console.info(`[ Done 🤪  Find fresh emoji tag ]`);
}
