#!/usr/bin/env ts-node
// update-version-in-config.ts

import commander from 'commander';
import { readFile, writeFile } from 'fs/promises';
import { basename, join } from 'path';
import { spaceTrim } from 'spacetrim';
import colors from 'yoctocolors';
import { version } from '../../package.json';
import { GENERATOR_WARNING } from '../../src/config';
import { assertsError } from '../../src/errors/assertsError';
import { PROMPTBOOK_ENGINE_VERSION } from '../../src/version';
import { commit } from '../utils/autocommit/commit';
import { isWorkingTreeClean } from '../utils/autocommit/isWorkingTreeClean';

if (process.cwd() !== join(__dirname, '../..')) {
    console.error(colors.red(`CWD must be root of the project`));
    process.exit(1);
}

const program = new commander.Command();
program.option('--commit', `Autocommit changes`, false);
program.parse(process.argv);

const { commit: isCommited } = program.opts();

generatePackages({ isCommited })
    .catch((error) => {
        assertsError(error);
        console.error(colors.bgRed(`${error.name} in ${basename(__filename)}`));
        console.error(colors.red(error.stack || error.message));
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

async function generatePackages({ isCommited }: { isCommited: boolean }) {
    if (isCommited && !(await isWorkingTreeClean(process.cwd()))) {
        throw new Error(`Working tree is not clean`);
    }

    const BOOK_LANGUAGE_VERSION = await readFile(`./book/version.txt`, 'utf-8');

    console.info(
        `🆚 Update Promptbook engine version to ${version} and book language version to ${BOOK_LANGUAGE_VERSION}`,
    );

    await writeFile(
        `./src/version.ts`, // <- Note: [🏳‍🌈] Maybe use json file (used .ts file (not .json) to avoid support of json files in bundle)
        spaceTrim(
            (block) => `
                // ${block(GENERATOR_WARNING)}

                import type { string_semantic_version } from './types/typeAliases';

                /**
                 * The version of the Book language
                 *
                 * @generated
                 * @see https://github.com/webgptorg/book
                 */
                export const BOOK_LANGUAGE_VERSION: string_semantic_version = '${BOOK_LANGUAGE_VERSION}';

                /**
                 * The version of the Promptbook engine
                 *
                 * @generated
                 * @see https://github.com/webgptorg/promptbook
                 */
                export const PROMPTBOOK_ENGINE_VERSION: string_promptbook_version = '${version}';

                /**
                 * Represents the version string of the Promptbook engine.
                 * It follows semantic versioning (e.g., \`${PROMPTBOOK_ENGINE_VERSION}\`).
                 *
                 * @generated
                 */
                export type string_promptbook_version = string_semantic_version;

                /**
                 * TODO: string_promptbook_version should be constrained to the all versions of Promptbook engine
                 * Note: [💞] Ignore a discrepancy between file name and entity name
                 */



            `,
        ),
    );

    if (isCommited) {
        await commit(['src'], `🆚 Update \`${version}\` -> \`version.ts\``);
    }

    // Note: Just append the version into loooong list
    // TODO: Is there a secure and simple way to write in append-only mode?
    // TODO: [🧠] Maybe handle this dynamically via `npm view ptbk/* versions` (but its not complete)

    const allVersions = await readFile(`./src/versions.txt`, 'utf-8');
    const newAllVersions = `${spaceTrim(allVersions)}\n${version}\n`;
    await writeFile(`./src/versions.txt`, newAllVersions, 'utf-8');

    if (isCommited) {
        await commit(['src'], `🆚 Add \`${version}\` -> \`versions.txt\``);
    }

    let dockerfile = await readFile(`./Dockerfile`, 'utf-8');
    dockerfile = dockerfile.replace(/^RUN\s+npm\s+i\s+ptbk@?.*$/m, `RUN npm i ptbk@${version}`);
    await writeFile(`./Dockerfile`, dockerfile, 'utf-8');

    if (isCommited) {
        await commit(['Dockerfile'], `🆚🐋 Update \`${version}\` -> \`Dockerfile\``);
    }
}

/**
 * TODO: [main] !!3 The version is lagged one behind the actual version
 * Note: [⚫] Code in this file should never be published in any package
 */
