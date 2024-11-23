#!/usr/bin/env ts-node
// repair-imports.ts

import colors from 'colors';
import commander from 'commander';
import { join } from 'path';
import { findAllProjectFilesWithEntities } from '../utils/findAllProjectFilesWithEntities';
/*
import { findAllProjectFiles } from '../utils/findAllProjectFiles';
import { execCommands } from '../utils/execCommand/execCommands';
import { splitArrayIntoChunks } from './utils/splitArrayIntoChunks';
*/

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

    for (const file of filesWithDiscrepancies) {
        const { filename } = file;
        console.info(colors.yellow(`${filename}`));
    }

    if (filesWithDiscrepancies.length > 0) {
        console.info(colors.gray(`Found ${filesWithDiscrepancies.length} files with name discrepancies`));
    } else {
        console.info(colors.green(`No files with name discrepancies found`));
    }
}

/**
 * Note: [⚫] Code in this file should never be published in any package
 */
