#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import chalk from 'chalk';
import { writeFileSync } from 'fs';
import glob from 'glob-promise';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import type { string_char_emoji } from '../../src/types/typeAliasEmoji';
import { difference } from '../../src/utils/sets/difference';
import { $shuffleItems } from '../find-fresh-emoji-tag/utils/$shuffleItems';
import { EMOJIS_OF_SINGLE_PICTOGRAM } from '../find-fresh-emoji-tag/utils/emojis';

if (process.cwd() !== join(__dirname, '../..')) {
    console.error(chalk.red(`CWD must be root of the project`));
    process.exit(1);
}

generatePromptBoilerplate()
    .catch((error) => {
        console.error(chalk.bgRed(error.name || 'NamelessError'));
        console.error(error);
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

async function generatePromptBoilerplate() {
    console.info(`🚀  Generate prompt boilerplate files`);

    // Generate current date in YYYY-MM format
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const datePrefix = `${year}-${month}`;

    // Find the highest existing number in prompts for the current month only
    const promptFiles = await glob('prompts/**/*.md', {
        ignore: '**/node_modules/**',
    });

    let highestNumber = -10; // So first will be 0000 if none found
    const numberPattern = new RegExp(`${datePrefix}-(\\d{4})-`);

    for (const file of promptFiles) {
        const match = file.match(numberPattern);
        if (match && match[1]) {
            const number = parseInt(match[1], 10);
            if (number > highestNumber) {
                highestNumber = number;
            }
        }
    }

    // If no files for this month, highestNumber will be -10, so first will be 0000
    const startNumber = highestNumber < 0 ? 0 : highestNumber + 10;
    console.info(
        chalk.blue(
            `Highest existing number for ${datePrefix} found: ${Math.max(0, highestNumber)
                .toString()
                .padStart(4, '0')}`,
        ),
    );

    // Find used emojis in the codebase
    const allFiles = await glob('**/*.{ts,tsx,js,jsx,json,md,txt}', {
        ignore: '**/node_modules/**',
    });

    const usedEmojis = new Set<string_char_emoji>();

    for (const file of allFiles) {
        const fs = await import('fs');
        const content = fs.readFileSync(file, 'utf-8');

        for (const emoji of EMOJIS_OF_SINGLE_PICTOGRAM) {
            const tag = `[✨${emoji}]`;
            if (content.includes(tag)) {
                usedEmojis.add(emoji);
            }
        }
    }

    const freshEmojis = difference(EMOJIS_OF_SINGLE_PICTOGRAM, usedEmojis);
    const selectedEmojis = $shuffleItems(...Array.from(freshEmojis)).slice(0, 5);

    console.info(chalk.green(`Found ${freshEmojis.size} available fresh emojis`));
    console.info(chalk.green(`Selected emojis: ${selectedEmojis.map((emoji) => `[✨${emoji}]`).join(' ')}`));

    // Placeholder titles
    const titles = ['foo', 'bar', 'baz', 'qux', 'quux'];

    // Generate 5 files
    const filesToCreate = [];
    for (let i = 0; i < 5; i++) {
        const number = (startNumber + i * 10).toString().padStart(4, '0');
        const title = titles[i];
        const emoji = selectedEmojis[i];
        const filename = `${datePrefix}-${number}-${title}.md`;
        const filepath = join('prompts', filename);
        const content = spaceTrim(`

            [ ]

            [✨${emoji}] ${title}

            ---

            [ ]

            [✨${emoji}] ${title}

            ---

            [ ]

            [✨${emoji}] ${title}

            ---

            [ ]

            [✨${emoji}] ${title}


        `);

        filesToCreate.push({
            filepath,
            filename,
            content,
            emoji,
            number,
        });
    }

    // Create the files
    console.info(chalk.yellow(`Creating ${filesToCreate.length} files:`));

    for (const file of filesToCreate) {
        writeFileSync(file.filepath, file.content, 'utf-8');
        console.info(chalk.green(`✓ Created: ${file.filename} with [✨${file.emoji}]`));
    }

    console.info(chalk.bgGreen.black(` Successfully created ${filesToCreate.length} prompt boilerplate files! `));
}
