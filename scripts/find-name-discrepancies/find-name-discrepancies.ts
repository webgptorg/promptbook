#!/usr/bin/env ts-node
// repair-imports.ts

import colors from 'colors';
import commander from 'commander';
import { readFile } from 'fs/promises';
import { basename, join } from 'path';
import spaceTrim from 'spacetrim';
import { assertsError } from '../../src/errors/assertsError';
import { findAllProjectFilesWithEntities } from '../utils/findAllProjectFilesWithEntities';

if (process.cwd() !== join(__dirname, '../..')) {
    console.error(colors.red(`CWD must be root of the project`));
    process.exit(1);
}

const program = new commander.Command();
program.parse(process.argv);

/**
 * VSCode can do find and replace in files BUT it will not rename the files
 * This script will find all files where the file name is different from the name of the entity
 */
findNameDiscrepancies()
    .catch((error) => {
        assertsError(error);
        console.error(colors.bgRed(`${error.name} in ${basename(__filename)}`));
        console.error(colors.red(error.stack || error.message));
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

async function findNameDiscrepancies() {
    console.info(`🔎🩹 Find name discrepancies`);

    const filesWithEntities = await findAllProjectFilesWithEntities();

    const filenamesIndexFiles: /*WritableDeep<Awaited<ReturnType<typeof findAllProjectFilesWithEntities>>>*/ Array<string> =
        [];
    const filenamesWithDiscrepanciesNotIgnored: /*WritableDeep<Awaited<ReturnType<typeof findAllProjectFilesWithEntities>>>*/ Array<string> =
        [];

    for (const file of filesWithEntities) {
        const { filename, entities } = file;

        /**/
        // Note: Exclude package indexes in `/src/_packages`
        if (filename.includes('src/_packages')) {
            continue;
        }
        /**/

        /**/
        // Note: Exclude some files from the check:
        if (filename.endsWith('openapi-types.ts')) {
            continue;
        }
        /**/

        const content = await readFile(filename, 'utf-8');

        const isIgnored = content.includes('[💞]');

        if (isIgnored) {
            continue;
        }

        const isFileIndexFile = filename.endsWith('.index.ts');
        const isFileDiscrepantName = !entities.some(({ name }) => filename.includes(name));

        if (isFileDiscrepantName) {
            filenamesWithDiscrepanciesNotIgnored.push(filename);
        }

        if (isFileIndexFile) {
            filenamesIndexFiles.push(filename);
        }
    }

    for (const filename of filenamesWithDiscrepanciesNotIgnored) {
        console.info(colors.yellow(`${filename} <- File name not matching any of exported names`));
    }

    for (const filename of filenamesIndexFiles) {
        console.info(colors.yellow(`${filename} <- Not allowed index file`));
    }

    if (filenamesWithDiscrepanciesNotIgnored.length !== 0 || filenamesIndexFiles.length !== 0) {
        if (filenamesWithDiscrepanciesNotIgnored.length !== 0) {
            console.error(
                colors.red(
                    spaceTrim(`
                        Found ${filenamesWithDiscrepanciesNotIgnored.length} files with name discrepancies

                        Review the files listed above:
                        1) Rename the entity in the file according to the file name
                        2) Rename file to match the entity name
                        3) Add Note: [💞] Ignore a discrepancy between file name and entity name

                        Then commit:
                        Fix name discrepancies
                    `),
                ),
            );
        }

        if (filenamesWithDiscrepanciesNotIgnored.length !== 0 && filenamesIndexFiles.length !== 0) {
            console.error('\n');
        }

        if (filenamesIndexFiles.length !== 0) {
            console.error(
                colors.red(
                    spaceTrim(`
                        Found ${filenamesIndexFiles.length} index files

                        Review the files listed above:
                        1) Extract the entities into separate files, **use named exports**
                        2) Add Note: [💞] Allow this index file
                    `),
                ),
            );
        }
        process.exit(1);
    } else {
        console.info(colors.green(`No name discrepancies found`));
        process.exit(0);
    }
}

/**
 * Note: [⚫] Code in this file should never be published in any package
 */
