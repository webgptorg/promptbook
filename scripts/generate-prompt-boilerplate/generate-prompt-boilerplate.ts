#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import colors from 'colors';
import commander from 'commander';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import { buildPromptFilename, getPromptNumbering } from '../utils/prompts/getPromptNumbering';
import { formatPromptEmojiTag, getFreshPromptEmojiTags } from '../utils/prompts/promptEmojiTags';

if (process.cwd() !== join(__dirname, '../..')) {
    console.error(colors.red(`CWD must be root of the project`));
    process.exit(1);
}

const program = new commander.Command();
program.option('--count <count>', `Number of prompt boilerplate files to generate`, '5');
program.parse(process.argv);

const { count: countOption } = program.opts<{ readonly count: string }>();
const filesCount = parseFilesCount(countOption);

generatePromptBoilerplate({ filesCount })
    .catch((error) => {
        console.error(colors.bgRed(error.name || 'NamelessError'));
        console.error(error);
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

/**
 * Generates boilerplate prompt files with unique emoji tags.
 */
async function generatePromptBoilerplate({ filesCount }: { readonly filesCount: number }): Promise<void> {
    console.info(`🚀  Generate prompt boilerplate files`);

    const promptNumbering = await getPromptNumbering({
        promptsDir: join(process.cwd(), 'prompts'),
        step: 10,
        ignoreGlobs: ['**/node_modules/**'],
    });
    const highestNumber = promptNumbering.startNumber === 0 ? 0 : promptNumbering.startNumber - promptNumbering.step;
    console.info(
        colors.blue(
            `Highest existing number for ${promptNumbering.datePrefix} found: ${Math.max(0, highestNumber)}
                .toString()
                .padStart(4, '0')}`,
        ),
    );

    const { availableCount, selectedEmojis } = await getFreshPromptEmojiTags({
        count: filesCount,
        rootDir: process.cwd(),
    });

    console.info(colors.green(`Found ${availableCount} available fresh emojis`));
    console.info(
        colors.green(`Selected emojis: ${selectedEmojis.map((emoji) => formatPromptEmojiTag(emoji)).join(' ')}`),
    );

    // Placeholder titles
    const titles = ['foo', 'bar', 'baz', 'qux', 'brr'];

    // Generate files
    const filesToCreate = [];
    for (let i = 0; i < filesCount; i++) {
        const number = promptNumbering.startNumber + i * promptNumbering.step;
        const title = titles[i % titles.length];
        const emoji = selectedEmojis[i];
        const filename = buildPromptFilename(promptNumbering.datePrefix, number, title);
        const filepath = join('prompts', filename);
        const emojiTag = formatPromptEmojiTag(emoji);
        const one = spaceTrim(`

            [-]

            ${emojiTag} ${title}

            -   Keep in mind the DRY _(don't repeat yourself)_ principle.
            -   Do a proper analysis of the current functionality before you start implementing.
            -   Add the changes into the [changelog](./changelog/_current-preversion.md)
        `);
        const content = spaceTrim(
            (block) => `

                ${block(one)}

                ---

                ${block(one)}

                ---

                ${block(one)}

                ---

                ${block(one)}

            `,
        );

        filesToCreate.push({
            filepath,
            filename,
            content,
            emoji,
            number,
        });
    }

    // Create the files
    console.info(colors.yellow(`Creating ${filesToCreate.length} files:`));

    for (const file of filesToCreate) {
        writeFileSync(file.filepath, file.content, 'utf-8');
        console.info(colors.green(`✓ Created: ${file.filename} with ${formatPromptEmojiTag(file.emoji)}`));
    }

    console.info(colors.bgGreen(` Successfully created ${filesToCreate.length} prompt boilerplate files! `));
}

/**
 * Parses and validates the count of boilerplate files to create.
 */
function parseFilesCount(countOption: string): number {
    const filesCount = Number(countOption);

    if (!Number.isFinite(filesCount) || filesCount <= 0) {
        console.info(colors.yellow(`Invalid --count '${countOption}'. Falling back to default 5.`));
        return 5;
    }

    return Math.floor(filesCount);
}
