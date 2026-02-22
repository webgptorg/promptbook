#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import colors from 'colors';
import commander from 'commander';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import { buildPromptFilename, getPromptNumbering } from '../utils/prompts/getPromptNumbering';
import { formatPromptEmojiTag, getFreshPromptEmojiTags } from '../utils/prompts/promptEmojiTags';

type PromptTemplate = 'common' | 'agents-server';

if (process.cwd() !== join(__dirname, '../..')) {
    console.error(colors.red(`CWD must be root of the project`));
    process.exit(1);
}

const program = new commander.Command();
program.option('--count <count>', `Number of prompt boilerplate files to generate`, '5');
program.option('--template <template>', `Prompt template to use: common | agents-server`, 'common');
program.parse(process.argv);

const { count: countOption, template: templateOption } = program.opts<{
    readonly count: string;
    readonly template: string;
}>();
const filesCount = parseFilesCount(countOption);
const template = parsePromptTemplate(templateOption);

generatePromptBoilerplate({ filesCount, template })
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
async function generatePromptBoilerplate({
    filesCount,
    template,
}: {
    readonly filesCount: number;
    readonly template: PromptTemplate;
}): Promise<void> {
    console.info(`🚀  Generate prompt boilerplate files`);

    const promptTemplateContent = loadPromptTemplate(template);

    const promptNumbering = await getPromptNumbering({
        promptsDir: join(process.cwd(), 'prompts'),
        step: 10,
        ignoreGlobs: ['**/node_modules/**'],
    });
    const highestNumber = promptNumbering.startNumber === 0 ? 0 : promptNumbering.startNumber - promptNumbering.step;
    const highestNumberFormatted = Math.max(0, highestNumber).toString().padStart(4, '0');
    console.info(
        colors.blue(`Highest existing number for ${promptNumbering.datePrefix} found: ${highestNumberFormatted}`),
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
        const filename = buildPromptFilename(promptNumbering.datePrefix, number, buildPromptSlug(template, title));
        const filepath = join('prompts', filename);
        const emojiTag = formatPromptEmojiTag(emoji);
        const one = spaceTrim(
            (block) => `

                [-]

                ${emojiTag} ${title}

                ${block(promptTemplateContent)}
            `,
        );
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

/**
 * Parses and validates the prompt template name.
 */
function parsePromptTemplate(templateOption: string): PromptTemplate {
    if (
        templateOption === 'common' ||
        templateOption === 'agents-server'
        // <- TODO: Unhardcode and allow this dynamicly by the template files.
    ) {
        return templateOption;
    }

    console.info(colors.yellow(`Invalid --template '${templateOption}'. Falling back to default 'common'.`));
    return 'common';
}

/**
 * Loads prompt template markdown content from the local templates folder.
 */
function loadPromptTemplate(template: PromptTemplate): string {
    const templateFilePath = join(__dirname, 'templates', `${template}.template.md`);
    return readFileSync(templateFilePath, 'utf-8').trim();
}

/**
 * Builds filename slug from template and placeholder title.
 */
function buildPromptSlug(template: PromptTemplate, title: string): string {
    if (template === 'common') {
        return title;
    }

    return `${template}-${title}`;
}
