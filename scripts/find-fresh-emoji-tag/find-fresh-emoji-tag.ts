#!/usr/bin/env ts-node
// find-fresh-emoji-tag.ts

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import colors from 'colors';
import { readFileSync } from 'fs';
import glob from 'glob-promise'; // <- TODO: [🚰] Use just 'glob'
import { basename, join } from 'path';
import type { string_char_emoji } from '../../src/types/typeAliasEmoji';
import { $shuffleItems } from './utils/$shuffleItems';
import { difference } from './utils/difference';
import { EMOJIS, EMOJIS_OF_SINGLE_PICTOGRAM } from './utils/emojis';

if (process.cwd() !== join(__dirname, '../..')) {
    console.error(colors.red(`CWD must be root of the project`));
    process.exit(1);
}

// Note: When run as a standalone script, call the exported function
if (require.main === module) {
    findFreshEmojiTag()
        .catch((error) => {
            console.error(colors.bgRed(`${error.name} in ${basename(__filename)}`));
            console.error(colors.red(error.stack || error.message));
            process.exit(1);
        })
        .then(() => {
            process.exit(0);
        });
}

/**
 * Finds fresh emoji tags that are not yet used in the codebase.
 *
 * @public exported from `@promptbook/cli`
 */
export async function findFreshEmojiTag(): Promise<void> {
    console.info(`🤪  Find fresh emoji tag`);

    // Do here stuff you want to test
    //========================================>
    EMOJIS;

    const allFiles = await glob('**/*.{ts,tsx,js,jsx,json,md,txt}', {
        ignore: '**/node_modules/**', // <- TODO: [🚰] Ignore also hidden folders like *(`.promptbook`, `.next`, `.git`,...)*
    });

    const allEmojis = EMOJIS_OF_SINGLE_PICTOGRAM;
    // const allEmojis = new Set<string_char_emoji>(['🧎' as string_char_emoji, '🥎' as string_char_emoji]);
    const usedEmojis = new Set<string_char_emoji>();

    for (const file of allFiles) {
        try {
            const content = readFileSync(file, 'utf-8'); /* <- Note: Its OK to use sync in tooling for scripts */

            for (const emoji of allEmojis) {
                const tag = `[${emoji}]`;
                if (content.includes(tag)) {
                    usedEmojis.add(emoji);
                }
            }
        } catch (error) {
            console.error(colors.red('Error in checking file file /' + file));
            console.error(error);
        }
    }

    //console.info({ usedEmojis });
    const freshEmojis = difference(allEmojis, usedEmojis);

    console.info(colors.green(`Avialable fresh tags:`));

    const randomEmojis = [...$shuffleItems(...Array.from(freshEmojis))].splice(0, 10);
    // const randomEmojis = freshEmojis;
    // const randomEmojis = usedEmojis;

    for (const emoji of randomEmojis) {
        const tag = `[${emoji}]`;
        console.info(colors.bgWhite(tag));
    }

    //========================================/

    // console.info(`[ Done 🤪  Find fresh emoji tag ]`);
}

/**
 * Note: [⚫] Code in this file should never be published in any package
 */
