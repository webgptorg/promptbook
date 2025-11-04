#!/usr/bin/env ts-node
// repair-imports.ts

import colors from 'colors';
import commander from 'commander';
import { basename, dirname, join, relative } from 'path';
import spaceTrim from 'spacetrim';
import { assertsError } from '../../src/errors/assertsError';
import { commit } from '../utils/autocommit/commit';
import { isWorkingTreeClean } from '../utils/autocommit/isWorkingTreeClean';
import { findAllProjectEntities } from '../utils/findAllProjectEntities';
import { readAllProjectFiles } from '../utils/readAllProjectFiles';
import { writeAllProjectFiles } from '../utils/writeAllProjectFiles';
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
program.option('--organize', `Organize imports`, false);
program.option('--organize-all', `Organize all imports`, false);
program.option('--commit', `Auto commit`, false);
program.parse(process.argv);

const { organize: isOrganized, organizeAll: isOrganizedAll, commit: isCommited } = program.opts();

/**
 * VSCode sometimes offers auto-import which is malformed, for example:
 * > import type { PipelineJson, TaskJson } from '../../_packages/types.index';
 *
 * This script fixes that
 */
repairImports({ isOrganized, isOrganizedAll, isCommited })
    .catch((error) => {
        assertsError(error);
        console.error(colors.bgRed(`${error.name} in ${basename(__filename)}`));
        console.error(colors.red(error.stack || error.message));
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

async function repairImports({
    isOrganized,
    // isOrganizedAll,
    isCommited,
}: {
    readonly isOrganized: boolean;
    readonly isOrganizedAll: boolean;
    readonly isCommited: boolean;
}) {
    console.info(`🏭🩹 Repair imports`);

    if (isCommited && !(await isWorkingTreeClean(process.cwd()))) {
        throw new Error(`Working tree is not clean`);
    }

    const allEntities = await findAllProjectEntities();
    const files = await readAllProjectFiles();
    const unfoundEntities: Array<{ entity: string; filePath: string }> = [];

    for (const file of files) {
        if (file.path === join(__dirname, '../../src/index.tsx').split('\\').join('/')) {
            continue;
        }

        if (file.path.includes('_packages')) {
            // Note: Do not repair imports in files which defines exported packages
            continue;
        }

        if (file.path.includes('JavascriptEvalExecutionTools.ts')) {
            // Note: [💎] Do not repair imports in file where we need a bit special treatment of imports because of the `eval`
            continue;
        }

        if (file.path.includes('test/ptbk.test.ts')) {
            // Note: No need to repair imports in test files
            continue;
        }

        /*/
        // Note: Keep this for testing single file
        if (!file.path.includes('compilePipeline.ts')) {
            continue;
        }
        /**/

        const matches = Array.from(
            file.content.matchAll(
                /**/ /^import\s+(type\s+)?\{\s+(?<importedEntities>[^;]*?)\s+\}\s+from\s+'\..*?';$/gm,
                //   /^import\s+(type\s+)?\{\s+(?<importedEntities>[^;]*?)\s+\}\s+from\s+'((.*?\.index))';$/gm,
            ),
        );

        if (matches.length === 0) {
            console.info(colors.gray('/' + relative(process.cwd(), file.path).split('\\').join('/')));
        } else {
            console.info(
                colors.green('/' + relative(process.cwd(), file.path).split('\\').join('/') + ` (${matches.length}x)`),
            );
        }

        for (const match of matches) {
            if (
                file.path.includes('AzureOpenAiExecutionTools.ts') &&
                match.groups!.importedEntities.includes('Usage')
            ) {
                console.log({ match });
            }

            const importedEntities = match
                .groups!.importedEntities.split(',')
                .map((importedEntity) => spaceTrim(importedEntity))
                .filter((entity) => entity !== '');

            const validImports: string[] = [];
            let hasUnfoundEntities = false;

            for (const importedEntity of importedEntities) {
                const entity = allEntities.find(({ name }) => name === importedEntity);

                if (!entity) {
                    unfoundEntities.push({ entity: importedEntity, filePath: file.path });
                    hasUnfoundEntities = true;
                } else {
                    let importFrom = relative(dirname(file.path), entity.filename)
                        // Note: Changing Windows path to Unix path (\ to /)
                        .split('\\')
                        .join('/')
                        // Note: Removing extension
                        .split(/\.(?:tsx?|jsx?)$/)
                        .join('');

                    if (!importFrom.startsWith('.')) {
                        importFrom = './' + importFrom;
                    }

                    validImports.push(
                        `import ${!entity.isType ? `` : `type `}{ ${importedEntity} } from '${importFrom}';`,
                    );
                }
            }

            // Only replace if we have valid imports and no unfound entities in this match
            if (validImports.length > 0 && !hasUnfoundEntities) {
                file.content = file.content.replace(match[0]!, validImports.join('\n'));
            }
        }
    }

    // Report all unfound entities
    if (unfoundEntities.length > 0) {
        console.info(colors.red(`\n❌ Found ${unfoundEntities.length} unfound entities:`));

        // Group by file for better readability
        const entitiesByFile = unfoundEntities.reduce((acc, { entity, filePath }) => {
            if (!acc[filePath]) {
                acc[filePath] = [];
            }
            acc[filePath].push(entity);
            return acc;
        }, {} as Record<string, string[]>);

        console.info(colors.blue(`\n📋 Available entities:`));
        console.info(
            allEntities.map(({ type, name }) => colors.gray(`   • ${type} `) + colors.blue(`${name}`)).join('\n'),
        );
        console.info(colors.blue(`\n📋 Available entities ↑`));

        for (const [filePath, entities] of Object.entries(entitiesByFile)) {
            console.info(colors.yellow(`\n📁 ${relative(process.cwd(), filePath).split('\\').join('/')}`));
            for (const entity of entities) {
                console.info(colors.red(`   • ${entity}`));
            }
        }

        throw new Error(`Cannot repair imports: ${unfoundEntities.length} entities not found in project.`);
    }

    await writeAllProjectFiles(files, isOrganized);

    if (isCommited) {
        await commit(['.'], `🧹 Repair imports`);
    }

    /*
    TODO: Fix & implement
    if (isOrganizedAll) {
        console.info('Organizing all imports...');

        try {
            const cwd = join(__dirname, '../../');
            await execCommands({
                cwd,
                commands: splitArrayIntoChunks(
                    await findAllProjectFiles(),
                    100 /* <- Note: We are getting here "Error: spawn ENAMETOOLONG" so the command is splitted into multiple ones * /,
                ).map(
                    (paths) =>
                        `npx organize-imports-cli ${paths
                            .map((path) => relative(cwd, path).split('\\').join('/'))
                            .join(' ')}`,
                ),
            });
        } catch (error) {
            assertsError(error);

            if (error.message.includes('No files specified')) {
                console.info(colors.red(`No files to be organized`));
            }

            throw error;
        }
    }

    if (isCommited) {
        await commit(['.'], `🧹 Organize imports`);
    }
    */
}

/**
 * Note: [⚫] Code in this file should never be published in any package
 */
