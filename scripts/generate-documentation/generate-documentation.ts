#!/usr/bin/env ts-node
// generate-documentation.ts

import colors from 'colors';
import commander from 'commander';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import spaceTrim from 'spacetrim';
import { COMMANDS } from '../../src/commands/index';
import { FORMFACTOR_DEFINITIONS } from '../../src/formfactors/index';
import { NonTaskSectionTypes, SectionTypes } from '../../src/types/SectionType';
import { TaskTypes } from '../../src/types/TaskType';
import { TODO_USE } from '../../src/utils/organization/TODO_USE';
import { commit } from '../utils/autocommit/commit';
import { isWorkingTreeClean } from '../utils/autocommit/isWorkingTreeClean';

if (process.cwd() !== join(__dirname, '../..')) {
    console.error(colors.red(`CWD must be root of the project`));
    process.exit(1);
}

const program = new commander.Command();
program.option('--commit', `Autocommit changes`, false);
program.option('--skip-bundler', `Skip the build process of bundler`, false);
program.parse(process.argv);

const { commit: isCommited } = program.opts();

generateDocumentation({ isCommited })
    .catch((error: Error) => {
        console.error(colors.bgRed(error.name));
        console.error(colors.red(error.stack || error.message));
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

async function generateDocumentation({ isCommited }: { isCommited: boolean }) {
    console.info(`📚  Generating documentation`);

    if (isCommited && !(await isWorkingTreeClean(process.cwd()))) {
        throw new Error(`Working tree is not clean`);
    }

    // ==============================

    TODO_USE(COMMANDS);
    TODO_USE(FORMFACTOR_DEFINITIONS);
    TODO_USE(SectionTypes);
    TODO_USE(NonTaskSectionTypes);
    TODO_USE(TaskTypes);

    const indexContent = spaceTrim(
        (block) => `
            #  Documentation

            ## Commands

            ${block(COMMANDS.map(({ name, documentationUrl }) => `- [${name}](${documentationUrl})`).join('\n'))}

        `,
    );

    await writeFile('documents/README.md', indexContent, 'utf-8');

    // ==============================
    // 9️⃣ Commit the changes

    if (isCommited) {
        await commit(['documents'], `📚 Generating documentation`);
    }
}

/**
 * Note: [⚫] Code in this file should never be published in any package
 */
