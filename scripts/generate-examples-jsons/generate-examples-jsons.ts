#!/usr/bin/env ts-node
// generate-examples-jsons.ts

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import colors from 'colors';
import commander from 'commander';
import { readFile, writeFile } from 'fs/promises';
import glob from 'glob-promise';
import { dirname, join } from 'path';
import { pipelineStringToJson } from '../../src/conversion/pipelineStringToJson';
import { stringifyPipelineJson } from '../../src/conversion/utils/stringifyPipelineJson';
import { usageToHuman } from '../../src/execution/utils/usageToHuman';
//import { MockedFackedLlmExecutionTools } from '../../src/llm-providers/mocked/MockedFackedLlmExecutionTools';
import { forTime } from 'waitasecond';
import { validatePipeline } from '../../src/conversion/validation/validatePipeline';
import { $provideExecutablesForNode } from '../../src/executables/$provideExecutablesForNode';
import { $provideLlmToolsForTestingAndScriptsAndPlayground } from '../../src/llm-providers/_common/register/$provideLlmToolsForTestingAndScriptsAndPlayground';
import { PrepareAndScrapeOptions } from '../../src/prepare/PrepareAndScrapeOptions';
import { $provideFilesystemForNode } from '../../src/scrapers/_common/register/$provideFilesystemForNode';
import { $provideScrapersForNode } from '../../src/scrapers/_common/register/$provideScrapersForNode';
import { PipelineString } from '../../src/types/PipelineString';
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

generateExampleJsons({ isCommited, isCacheReloaded, isVerbose })
    .catch((error) => {
        console.error(colors.bgRed(error.name /* <- 11:11 */));
        console.error(colors.red(error.stack || error.message));
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

async function generateExampleJsons({
    isCommited,
    isCacheReloaded,
    isVerbose,
}: {
    isCommited: boolean;
    isCacheReloaded: boolean;
    isVerbose: boolean;
}) {
    console.info(`🏭📖  Convert examples .book.md -> .book.json`);

    if (isCommited && !(await isWorkingTreeClean(process.cwd()))) {
        throw new Error(`Working tree is not clean`);
    }

    const fs = $provideFilesystemForNode();
    const llm = $provideLlmToolsForTestingAndScriptsAndPlayground({ isCacheReloaded, isVerbose });
    //                 <- Note: for example here we don`t want the [🌯]
    const executables = await $provideExecutablesForNode();

    const pipelineMarkdownFilePaths = await glob(join(PROMPTBOOK_EXAMPLES_DIR, '*.book.md').split('\\').join('/'));

    /*/
    // Note: Keep for testing:
    pipelineMarkdownFilePaths = pipelineMarkdownFilePaths.filter((path) => path.includes('simple-knowledge.book.md'));
    /**/

    for (const pipelineMarkdownFilePath of pipelineMarkdownFilePaths) {
        const pipelineMarkdown = await readFile(pipelineMarkdownFilePath, 'utf-8');

        try {
            const options: PrepareAndScrapeOptions = {
                rootDirname: dirname(pipelineMarkdownFilePath),
            };
            const pipelineJson = await pipelineStringToJson(
                pipelineMarkdown as PipelineString,
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

            const pipelineJsonFilePath = pipelineMarkdownFilePath.replace(/\.ptbk\.md$/, '.book.json');

            // Note: We want to ensure that the generated JSONs are logically correct
            validatePipeline(pipelineJson);

            await writeFile(pipelineJsonFilePath, stringifyPipelineJson(pipelineJson));

            console.info(colors.green(`📖  Generated .book.json from ${pipelineMarkdownFilePath}`));
        } catch (error) {
            if (!(error instanceof Error)) {
                throw error;
            }

            console.info(colors.bgWhite('========================='));
            console.info(colors.red(`Error in ${pipelineMarkdownFilePath}`));
            console.error(colors.bgRed(error.name /* <- 11:11 */));
            console.error(colors.red(error.stack || error.message));
            console.info(colors.bgWhite('========================='));
        }
    }

    console.info(colors.cyan(usageToHuman(llm.getTotalUsage())));

    if (isCommited) {
        await commit([PROMPTBOOK_EXAMPLES_DIR], `📖 Convert examples \`.book.md\` -> \`.book.json\``);
    }

    console.info(`[ Done 📖  Convert examples .book.md -> .book.json]`);
}

/**
 * Note: [🍠] @@@ Example pipelines vs Pipelines used internally in Promptbook
 * TODO: [🍥] When using current time in `preparations` it changes all .book.json files each time so until some more elegant solution omit the time from prepared pipeline
 * Note: [⚫] Code in this file should never be published in any package
 */
