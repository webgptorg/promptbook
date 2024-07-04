#!/usr/bin/env ts-node
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import colors from 'colors';
import commander from 'commander';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { createLibraryFromDirectory } from '../../src/library/constructors/createLibraryFromDirectory';
import { libraryToJson } from '../../src/library/libraryToJson';
import { commit } from '../utils/autocommit/commit';

if (process.cwd() !== join(__dirname, '../..')) {
    console.error(colors.red(`CWD must be root of the project`));
    process.exit(1);
}

const program = new commander.Command();
program.option('--commit', `Auto commit`, false);
program.parse(process.argv);

const { commit: isCommited } = program.opts();

makePromptbookLibrary({ isCommited })
    .catch((error) => {
        console.error(colors.bgRed(error.name || 'NamelessError'));
        console.error(error);
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

async function makePromptbookLibrary({ isCommited }: { isCommited: boolean }) {
    console.info(`📖 Make Promptbook library`);

    const promptbookSourceDir = 'promptbook-library';

    const library = await createLibraryFromDirectory(promptbookSourceDir, {
        isVerbose: true,
        isRecursive: true,
    });

    const libraryJson = await libraryToJson(library);
    const libraryJsonString = JSON.stringify(libraryJson);

    const libraryJsonFilePath = join(promptbookSourceDir, 'promptbook-library.json');
    const libraryJsonFileContent = libraryJsonString + '\n';

    const libraryTypescriptFilePath = join(promptbookSourceDir, 'promptbook-library.ts');
    const libraryTypescriptFileContent = 'export default ' + libraryJsonString + ';\n';

    // TODO: [🏳‍🌈] Finally take one of .json vs .ts (using .ts file (not .json) to avoid support of json files in bundle )
    await writeFile(libraryJsonFilePath, libraryJsonFileContent, 'utf-8');
    console.info(colors.green(`Maked ${libraryJsonFilePath}`));
    await writeFile(libraryTypescriptFilePath, libraryTypescriptFileContent, 'utf-8');
    console.info(colors.green(`Maked ${libraryTypescriptFilePath}`));

    if (isCommited) {
        await commit(promptbookSourceDir, `📖 Make Promptbook library`);
    }

    console.info(`[ Done 📖 Make Promptbook library ]`);
}

/**
 * TODO: Maybe use `promptbook make` cli command instead of this script (but figure out what to do with nessesity to have library commited here)
 * TODO: !!! Use `promptbook make` cli command this in WebGPT and Promptbook
 */
