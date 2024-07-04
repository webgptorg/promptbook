#!/usr/bin/env ts-node
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import colors from 'colors';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { createLibraryFromDirectory } from '../../src/library/constructors/createLibraryFromDirectory';
import { libraryToJson } from '../../src/library/constructors/libraryToJson';

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

    const library = await createLibraryFromDirectory(promptbookSourceDir, {
        isRecursive: true,
    });

    const libraryJson = libraryToJson(library);
    const libraryJsonString = JSON.stringify(libraryJson);
    const libraryJsonFileContent = libraryJsonString + '\n';
    const libraryTypescriptFileContent = 'export default ' + libraryJsonString + ';\n';

    // TODO: [🏳‍🌈] Finally take one of .json vs .ts
    await writeFile(
        `${promptbookSourceDir}/promptbook-library.json` /* <- Note: [🏳‍🌈] Maybe make .ts file (not .json) to avoid support of json files in bundle */,
        libraryJsonFileContent,
        'utf-8',
    );

    await writeFile(`${promptbookSourceDir}/promptbook-library.ts`, libraryTypescriptFileContent, 'utf-8');

    console.info(`[ Done 📖 Make  Promptbook library ]`);
}

/**
 * TODO: !!! Transfer this to WebGPT and Promptbook
 */
