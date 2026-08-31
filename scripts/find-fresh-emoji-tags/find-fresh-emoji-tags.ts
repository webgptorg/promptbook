// find-fresh-emoji-tags.ts

import * as dotenv from 'dotenv';

import colors from 'colors';
import { basename } from 'path';
import { $shuffleItems } from './utils/$shuffleItems';
import { scanEmojiTagUsage } from '../utils/emojiTags/scanEmojiTagUsage';
import { VALID_SINGLE_PICTOGRAM_EMOJIS } from '../utils/emojiTags/validSinglePictogramEmojis';

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
 * Initializes environment for this script.
 *
 * @private utility for `findFreshEmojiTag`
 */
function initializeFindFreshEmojiTagRun(): void {
    dotenv.config({ path: '.env' });
}

/**
 * Finds fresh emoji tags that are not yet used in the codebase.
 *
 * @public exported from `@promptbook/cli`
 */
export async function findFreshEmojiTag(): Promise<void> {
    initializeFindFreshEmojiTagRun();

    console.info(`🤪  Find fresh emoji tag`);

    const allEmojis = VALID_SINGLE_PICTOGRAM_EMOJIS;
    const { usedEmojis } = await scanEmojiTagUsage({
        candidateEmojis: allEmojis,
        tagPrefix: '',
        onFileError: (error, filePath) => {
            console.error(colors.red('Error in checking file /' + filePath));
            console.error(error);
        },
    });
    const freshEmojis = new Set(Array.from(allEmojis).filter((emoji) => !usedEmojis.has(emoji)));

    console.info(colors.green(`Avialable fresh tags:`));

    const randomEmojis = [...$shuffleItems(...Array.from(freshEmojis))].splice(0, 10);
    // const randomEmojis = freshEmojis;
    // const randomEmojis = usedEmojis;

    for (const emoji of randomEmojis) {
        const tag = `[${emoji}]`;
        console.info(colors.bgWhite(tag));
    }
}

// Note: [🟡] Code for CLI support script [find-fresh-emoji-tags](scripts/find-fresh-emoji-tags/find-fresh-emoji-tags.ts) should never be published outside of `@promptbook/cli`
