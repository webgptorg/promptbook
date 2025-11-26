#!/usr/bin/env ts-node
// generate-examples-bookc.ts

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import colors from 'colors';
import commander from 'commander';
import { readFile } from 'fs/promises';
import glob from 'glob-promise'; // <- TODO: [🚰] Use just 'glob'
import { basename, dirname, join } from 'path';
import { compilePipeline } from '../../src/conversion/compilePipeline';
import { usageToHuman } from '../../src/execution/utils/usageToHuman';
//import { MockedFackedLlmExecutionTools } from '../../src/llm-providers/mocked/MockedFackedLlmExecutionTools';
import { forTime } from 'waitasecond';
import { saveArchive } from '../../src/conversion/archive/saveArchive';
import { assertsError } from '../../src/errors/assertsError';
import { $provideExecutablesForNode } from '../../src/executables/$provideExecutablesForNode';
import { $provideLlmToolsForTestingAndScriptsAndPlayground } from '../../src/llm-providers/_common/register/$provideLlmToolsForTestingAndScriptsAndPlayground';
import { validatePipelineString } from '../../src/pipeline/validatePipelineString';
import { PrepareAndScrapeOptions } from '../../src/prepare/PrepareAndScrapeOptions';
import { $provideFilesystemForNode } from '../../src/scrapers/_common/register/$provideFilesystemForNode';
import { $provideScrapersForNode } from '../../src/scrapers/_common/register/$provideScrapersForNode';
import { commit } from '../utils/autocommit/commit';
import { isWorkingTreeClean } from '../utils/autocommit/isWorkingTreeClean';

if (process.cwd() !== join(__dirname, '../..')) {
    console.error(colors.red(`CWD must be root of the project`));
    process.exit(1);
}

const PROMPTBOOK_EXAMPLES_DIR = join(process.cwd(), 'examples/pipelines');

const program = new commander.Command();
program.option('--commit', `Autocommit changes`, false);
program.option('--reload', `Use LLM models even if cached `, false);
program.option('--verbose', `Is verbose`, false);

program.parse(process.argv);
const { commit: isCommited, reloadCache: isCacheReloaded, verbose: isVerbose } = program.opts();

generateExampleBookc({ isCommited, isCacheReloaded, isVerbose })
    .catch((error) => {
        console.error(colors.bgRed(`${error.name} in ${basename(__filename)}`));
        console.error(colors.red(error.stack || error.message));
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

async function generateExampleBookc({
    isCommited,
    isCacheReloaded,
    isVerbose,
}: {
    isCommited: boolean;
    isCacheReloaded: boolean;
    isVerbose: boolean;
}) {
    console.info(`🏭📖  Convert examples .book.md -> .bookc`);

    if (isCommited && !(await isWorkingTreeClean(process.cwd()))) {
        throw new Error(`Working tree is not clean`);
    }

    const fs = $provideFilesystemForNode();
    const llm = await $provideLlmToolsForTestingAndScriptsAndPlayground({ isCacheReloaded, isVerbose });
    //                 <- Note: for example here we don`t want the [🌯]
    const executables = await $provideExecutablesForNode();

    const pipelineMarkdownFilePaths = await glob(join(PROMPTBOOK_EXAMPLES_DIR, '*.book').split('\\').join('/'));

    /*/
    // Note: Keep for testing:
    pipelineMarkdownFilePaths = pipelineMarkdownFilePaths.filter((path) => path.includes('simple-knowledge.book'));
    /**/

    for (const pipelineMarkdownFilePath of pipelineMarkdownFilePaths) {
        const pipelineMarkdown = await readFile(pipelineMarkdownFilePath, 'utf-8');

        try {
            const options: PrepareAndScrapeOptions = {
                rootDirname: dirname(pipelineMarkdownFilePath),
            };

            const pipelineJson = await compilePipeline(
                validatePipelineString(pipelineMarkdown),
                {
                    llm,
                    fs,
                    scrapers: await $provideScrapersForNode({ fs, llm, executables }, options),
                },
                options,
            );

            await forTime(0);

            /*/
            // Note: Keep for testing:
            console.info(colors.cyan(usageToHuman(llmTools.getTotalUsage())));
            await forTime(1000000);
            /**/

            const pipelineJsonFilePath = pipelineMarkdownFilePath.replace(/\.book(\.md)?$/, '.bookc');

            await saveArchive(pipelineJsonFilePath, [pipelineJson], fs);

            console.info(colors.green(`📖  Generated .bookc from ${pipelineMarkdownFilePath}`));
        } catch (error) {
            assertsError(error);

            console.info(colors.bgWhite('========================='));
            console.info(colors.red(`Error in ${pipelineMarkdownFilePath}`));
            console.error(colors.bgRed(`${error.name} in ${basename(__filename)}`));
            console.error(colors.red(error.stack || error.message));
            console.info(colors.bgWhite('========================='));
        }
    }

    console.info(colors.cyan(usageToHuman(llm.getTotalUsage())));

    if (isCommited) {
        await commit([PROMPTBOOK_EXAMPLES_DIR], `📖 Convert examples \`.book.md\` -> \`.bookc\``);
    }

    console.info(`[ Done 📖  Convert examples .book.md -> .bookc]`);
}

/**
 * Note: [🍠] Example pipelines demonstrate usage patterns to end users, while the pipelines in the books directory provide core functionality for the Promptbook engine itself
 * TODO: [🍥] When using current time in `preparations` it changes all .bookc files each time so until some more elegant solution omit the time from prepared pipeline
 * Note: [⚫] Code in this file should never be published in any package
 */
