#!/usr/bin/env ts-node
// repair-imports.ts

import colors from 'colors';
import commander from 'commander';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import spaceTrim from 'spacetrim';
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
    .catch((error: Error) => {
        console.error(colors.bgRed(error.name /* <- 11:11 */));
        console.error(colors.red(error.stack || error.message));
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

async function findNameDiscrepancies() {
    console.info(`🔎🩹 Find name discrepancies`);

    const filesWithEntities = await findAllProjectFilesWithEntities();

    const filesWithDiscrepancies = filesWithEntities.filter(
        ({ filename, entities }) => !entities.some(({ name }) => filename.includes(name)),
    );

    const filenamesWithDiscrepanciesNotIgnored: /*WritableDeep<Awaited<ReturnType<typeof findAllProjectFilesWithEntities>>>*/ Array<string> =
        [];

    for (const file of filesWithDiscrepancies) {
        const { filename } = file;
        const content = await readFile(filename, 'utf-8');

        const isIgnored = content.includes('[💞]');

        if (!isIgnored) {
            filenamesWithDiscrepanciesNotIgnored.push(filename);
        }
    }

    for (const filename of filenamesWithDiscrepanciesNotIgnored) {
        console.info(colors.yellow(`${filename}`));
    }

    if (filenamesWithDiscrepanciesNotIgnored.length !== 0) {
        console.error(
            colors.red(
                spaceTrim(`
                    Found ${filenamesWithDiscrepanciesNotIgnored.length} files with name discrepancies

                    Review the files listed above:
                    1) Rename the entity in the file according to the file name
                    2) Rename file to match the entity name
                    3) Add Note: [💞] Ignore a discrepancy between file name and entity name
                `),
            ),
        );
        process.exit(1);
    } else {
        console.info(colors.green(`No name discrepancies found`));
        process.exit(0);
    }
}

/**
 * Note: [⚫] Code in this file should never be published in any package
 */
