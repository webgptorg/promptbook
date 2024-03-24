#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import colors from 'colors';
import commander from 'commander';
import { readFile, writeFile } from 'fs/promises';
import glob from 'glob-promise';
import { join } from 'path';
import { promptbookStringToJson } from '../../src/conversion/promptbookStringToJson';
import { validatePromptbookJson } from '../../src/conversion/validatePromptbookJson';
import { commit } from '../utils/autocommit/commit';
import { isWorkingTreeClean } from '../utils/autocommit/isWorkingTreeClean';

if (process.cwd() !== join(__dirname, '../..')) {
    console.error(colors.red(`CWD must be root of the project`));
    process.exit(1);
}

const PROMPTBOOK_SAMPLES_DIR = join(process.cwd(), 'samples/templates');

const program = new commander.Command();
program.option('--commit', `Autocommit changes`, false);
program.parse(process.argv);
const { commit: isCommited } = program.opts();

generateSampleJsons({ isCommited })
    .catch((error) => {
        console.error(colors.bgRed(error.name));
        console.error(error);
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

async function generateSampleJsons({ isCommited }: { isCommited: boolean }) {
    console.info(`🏭📖  Convert samples .ptbk.md -> .ptbk.json`);

    if (isCommited && !(await isWorkingTreeClean(process.cwd()))) {
        throw new Error(`Working tree is not clean`);
    }

    for (const promptbookMarkdownFilePath of await glob(
        join(PROMPTBOOK_SAMPLES_DIR, '*.ptbk.md').split('\\').join('/'),
    )) {
        console.info(`📖  Generating JSON from ${promptbookMarkdownFilePath}`);
        const promptbookMarkdown = await readFile(promptbookMarkdownFilePath, 'utf-8');

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const promptbookJson = promptbookStringToJson(promptbookMarkdown as any /* <- TODO: Remove any */);
            const promptbookJsonFilePath = promptbookMarkdownFilePath.replace(/\.ptbk\.md$/, '.ptbk.json');

            // Note: We want to ensure that the generated JSONs are logically correct
            validatePromptbookJson(promptbookJson);

            await writeFile(promptbookJsonFilePath, JSON.stringify(promptbookJson, null, 4) + '\n');
        } catch (error) {
            if (!(error instanceof Error)) {
                throw error;
            }

            console.info(colors.bgWhite('========================='));
            console.info(colors.red(`Error in ${promptbookMarkdownFilePath}`));
            console.error(colors.bgRed(error.name));
            console.error(error);
            console.info(colors.bgWhite('========================='));
        }
    }

    if (isCommited) {
        await commit(PROMPTBOOK_SAMPLES_DIR, `📖 Convert samples .ptbk.md -> .ptbk.json`);
    }

    console.info(`[ Done 📖  Convert samples .ptbk.md -> .ptbk.json]`);
}

/**
 * TODO: Do we want multiple levels of titles like in "The Witcher 3: Wild Hunt" should done like "# The Witcher 3 \n\n ## Wild Hunt"
 */
