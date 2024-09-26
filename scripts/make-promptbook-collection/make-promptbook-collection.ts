#!/usr/bin/env ts-node
// make-promptbook-collection.ts

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import colors from 'colors';
import commander from 'commander';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { collectionToJson } from '../../src/collection/collectionToJson';
import { createCollectionFromDirectory } from '../../src/collection/constructors/createCollectionFromDirectory';
import { usageToHuman } from '../../src/execution/utils/usageToHuman';
import { getLlmToolsForTestingAndScriptsAndPlayground } from '../../src/llm-providers/_common/getLlmToolsForTestingAndScriptsAndPlayground';
import { commit } from '../utils/autocommit/commit';
import { isWorkingTreeClean } from '../utils/autocommit/isWorkingTreeClean';

if (process.cwd() !== join(__dirname, '../..')) {
    console.error(colors.red(`CWD must be root of the project`));
    process.exit(1);
}

const program = new commander.Command();

program.option('--commit', `Auto commit`, false);
program.option('--reload-cache', `Use LLM models even if cached `, false);
program.option('--verbose', `Is verbose`, false);

program.parse(process.argv);

const { commit: isCommited, reloadCache: isCacheReloaded, verbose: isVerbose } = program.opts();

makePipelineCollection({ isCommited, isCacheReloaded, isVerbose })
    .catch((error) => {
        console.error(colors.bgRed(error.name || 'NamelessError'));
        console.error(error);
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

async function makePipelineCollection({
    isCommited,
    isCacheReloaded,
    isVerbose,
}: {
    isCommited: boolean;
    isCacheReloaded: boolean;
    isVerbose: boolean;
}) {
    console.info(`📖 Make Promptbook library`);

    if (isCommited && !(await isWorkingTreeClean(process.cwd()))) {
        throw new Error(`Working tree is not clean`);
    }

    const promptbookSourceDir = 'promptbook-collection';

    const llmTools = getLlmToolsForTestingAndScriptsAndPlayground({ isCacheReloaded });

    const collection = await createCollectionFromDirectory(promptbookSourceDir, {
        llmTools,
        isVerbose,
        isRecursive: true,
        // <- TODO: [🍖] isCacheReloaded
    });

    const collectionJson = await collectionToJson(collection);
    const collectionJsonString = JSON.stringify(collectionJson);

    const collectionJsonFilePath = join(promptbookSourceDir, 'index.json');
    const collectionJsonFileContent = collectionJsonString + '\n';

    const libraryTypescriptFilePath = join(promptbookSourceDir, 'index.ts');
    const libraryTypescriptFileContent = 'export default ' + collectionJsonString + ';\n';

    console.info(colors.cyan(usageToHuman(llmTools.getTotalUsage())));

    // TODO: [🏳‍🌈] Finally take one of .json vs .ts (using .ts file (not .json) to avoid support of json files in bundle )
    await writeFile(collectionJsonFilePath, collectionJsonFileContent, 'utf-8');
    console.info(colors.green(`Maked ${collectionJsonFilePath}`));
    await writeFile(libraryTypescriptFilePath, libraryTypescriptFileContent, 'utf-8');
    console.info(colors.green(`Maked ${libraryTypescriptFilePath}`));

    if (isCommited) {
        await commit([promptbookSourceDir], `📖 Make Promptbook library`);
    }

    console.info(`[ Done 📖 Make Promptbook library ]`);
}

/**
 * Note: [🍠] @@@ Sample pipelines vs Pipelines used internally in Promptbook
 * TODO: [🌼] Maybe use `ptbk make` cli command instead of this script (but figure out what to do with nessesity to have library commited here)
 * TODO: [main] !!! Use `ptbk make` cli command this in WebGPT and Promptbook
 */
