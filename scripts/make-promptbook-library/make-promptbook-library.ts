#!/usr/bin/env ts-node
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import colors from 'colors';
import { readFile, writeFile } from 'fs/promises';
import glob from 'glob-promise';
import { join } from 'path';
import { promptbookStringToJson } from '../../src/conversion/promptbookStringToJson';
import { validatePromptbookJson } from '../../src/conversion/validation/validatePromptbookJson';
// import { createPromptbookLibraryFromDirectory } from '../../src/promptbook-library/constructors/createPromptbookLibraryFromDirectory';
import { PromptbookJson } from '../../src/types/PromptbookJson/PromptbookJson';
import { PromptbookString } from '../../src/types/PromptbookString';

if (process.cwd() !== join(__dirname, '../..')) {
    console.error(colors.red(`CWD must be root of the project`));
    process.exit(1);
}

makePromptbookLibrary()
    .catch((error) => {
        console.error(colors.bgRed(error.name || 'NamelessError'));
        console.error(error);
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

async function makePromptbookLibrary() {
    console.info(`📖 Make Promptbook library`);

    const promptbookSourceDir = 'promptbook-library';
    const promptbookBuildPath = `${promptbookSourceDir}/promptbook-library.json`;

    const promptbookFiles = await glob(promptbookSourceDir + '/**/*.ptbk.md');

    /*
    TODO: !!!!! Compile, serialize and deserialize whiole promptbook library with one util + Use it in WebGPT and Promptbook.studio

    const promptbookLibrary = await createPromptbookLibraryFromDirectory(promptbookSourceDir, {
        isRecursive: true,
        isLazyLoaded: false,
    });

    // TODO: Serialize this as library into json
    console.log('!!', {
        promptbookLibrary,
        promptbooks: await promptbookLibrary.listPromptbooks(),
    });
    */
    const promptbooks: Array<PromptbookJson> = [];

    for (const promptbookFile of promptbookFiles) {
        const content = await readFile(promptbookFile, 'utf-8');
        const ptbkJson = await promptbookStringToJson(content as PromptbookString);
        try {
            validatePromptbookJson(ptbkJson);
        } catch (error) {
            const reportFile = promptbookFile.split('.ptbk.md').join('.ptbk.error.json');
            console.info(`⚠ ${ptbkJson.promptbookUrl}`);
            console.error(`See: ${promptbookFile}`);
            console.error(`See: ${reportFile}`);
            await writeFile(reportFile, JSON.stringify(ptbkJson, null, 4) + '\n', 'utf-8');
            throw error;
        }

        if (ptbkJson.promptbookUrl === undefined) {
            continue;
        }

        console.info(`📖 ${ptbkJson.promptbookUrl}`);

        promptbooks.push(ptbkJson);
    }

    await writeFile(promptbookBuildPath, JSON.stringify(promptbooks) + '\n', 'utf-8');

    console.info(`[ Done 📖 Make  Promptbook library ]`);
}
