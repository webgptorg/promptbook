#!/usr/bin/env ts-node
// make-promptbook-collection.ts

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import commander from 'commander';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import colors from 'yoctocolors';
import { $execCommand, $provideScrapersForNode } from '../../src/_packages/node.index';
import { collectionToJson } from '../../src/collection/collectionToJson';
import { createCollectionFromDirectory } from '../../src/collection/constructors/createCollectionFromDirectory';
import { $provideExecutablesForNode } from '../../src/executables/$provideExecutablesForNode';
import { usageToHuman } from '../../src/execution/utils/usageToHuman';
import { $provideLlmToolsForTestingAndScriptsAndPlayground } from '../../src/llm-providers/_common/register/$provideLlmToolsForTestingAndScriptsAndPlayground';
import { $provideFilesystemForNode } from '../../src/scrapers/_common/register/$provideFilesystemForNode';
import { commit } from '../utils/autocommit/commit';
import { isWorkingTreeClean } from '../utils/autocommit/isWorkingTreeClean';

if (process.cwd() !== join(__dirname, '../..')) {
    console.error(colors.red(`CWD must be root of the project`));
    process.exit(1);
}

const program = new commander.Command();

program.option('--commit', `Auto commit`, false);
program.option('--reload', `Use LLM models even if cached `, false);
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
    console.info(`📖 Make Promptbook collection`);

    if (isCommited && !(await isWorkingTreeClean(process.cwd()))) {
        throw new Error(`Working tree is not clean`);
    }

    const promptbookSourceDir = 'books';

    const fs = $provideFilesystemForNode();
    const llm = await $provideLlmToolsForTestingAndScriptsAndPlayground({ isCacheReloaded });
    const executables = await $provideExecutablesForNode();
    const scrapers = await $provideScrapersForNode({ fs, llm, executables });

    const collection = await createCollectionFromDirectory(
        promptbookSourceDir,
        {
            fs,
            llm,
            scrapers,
        },
        {
            isVerbose,
            rootUrl: 'https://promptbook.studio/promptbook/',
            isRecursive: true,
            // <- TODO: [🍖] Add `intermediateFilesStrategy`
        },
    );

    const collectionJson = await collectionToJson(collection);
    const collectionJsonString = JSON.stringify(collectionJson);

    const collectionJsonFilePath = join(promptbookSourceDir, 'index.json');
    const collectionJsonFileContent = collectionJsonString + '\n';

    const collectionTypescriptFilePath = join(promptbookSourceDir, 'index.ts');
    const collectionTypescriptFileContent = 'export default ' + collectionJsonString + ';\n';

    console.info(colors.cyan(usageToHuman(llm.getTotalUsage())));

    // TODO: [🏳‍🌈] Finally take one of .json vs .ts (using .ts file (not .json) to avoid support of json files in bundle )
    await writeFile(collectionJsonFilePath, collectionJsonFileContent, 'utf-8');
    console.info(colors.green(`Made ${collectionJsonFilePath}`));
    await writeFile(collectionTypescriptFilePath, collectionTypescriptFileContent, 'utf-8');
    console.info(colors.green(`Made ${collectionTypescriptFilePath}`));

    if (isCommited) {
        await commit([promptbookSourceDir, '.promptbook'], `📖 Make Promptbook collection`);
    }

    // Note: Making collection for templates
    // Note: [🌼] Look here how it should look like

    const filePath = `./src/other/templates/getTemplatesPipelineCollection.ts`;
    await $execCommand({
        command: `npx ts-node ./src/cli/test/ptbk.ts make ./book/books --provider BRING_YOUR_OWN_KEYS --root-url https://github.com/webgptorg/book/blob/main/books/templates/ --format typescript --output ${filePath} --function-name getTemplatesPipelineCollection ${
            !isVerbose ? '' : '--verbose'
        }`,
        isVerbose,
    });

    let content = await readFile(filePath, 'utf-8');
    content = content.split(`@promptbook/core`).join(`../../collection/constructors/createCollectionFromJson`);
    content = content.split(`@promptbook/types`).join(`../../collection/PipelineCollection`);
    await writeFile(filePath, content, 'utf-8');

    if (isCommited) {
        await commit([filePath, '.promptbook'], `📖 Make Promptbook templates collection`);
    }

    console.info(`[ Done 📖 Make Promptbook collection ]`);
}

/**
 * Note: [🍠] Example pipelines demonstrate usage patterns to end users, while the pipelines in the books directory provide core functionality for the Promptbook engine itself
 * TODO: [🌼] Maybe use `ptbk make --no-interactive` cli command instead of this script (but figure out what to do with nessesity to have collection commited here)
 * TODO: [main] !!3 Use `ptbk make --no-interactive` cli command this in WebGPT and Promptbook
 * Note: [⚫] Code in this file should never be published in any package
 */
