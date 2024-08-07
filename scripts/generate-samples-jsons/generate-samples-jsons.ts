#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import colors from 'colors';
import commander from 'commander';
import { readFile, writeFile } from 'fs/promises';
import glob from 'glob-promise';
import { join } from 'path';
import { pipelineStringToJson } from '../../src/conversion/pipelineStringToJson';
import { stringifyPipelineJson } from '../../src/conversion/utils/stringifyPipelineJson';
import { validatePipeline } from '../../src/conversion/validation/validatePipeline';
import { usageToHuman } from '../../src/execution/utils/usageToHuman';
//import { MockedFackedLlmExecutionTools } from '../../src/llm-providers/mocked/MockedFackedLlmExecutionTools';
import { forTime } from 'waitasecond';
import { getLlmToolsForTestingAndScriptsAndPlayground } from '../../src/llm-providers/_common/getLlmToolsForTestingAndScriptsAndPlayground';
import { PipelineString } from '../../src/types/PipelineString';
import { commit } from '../utils/autocommit/commit';
import { isWorkingTreeClean } from '../utils/autocommit/isWorkingTreeClean';

if (process.cwd() !== join(__dirname, '../..')) {
    console.error(colors.red(`CWD must be root of the project`));
    process.exit(1);
}

const PROMPTBOOK_SAMPLES_DIR = join(process.cwd(), 'samples/templates');

const program = new commander.Command();
program.option('--commit', `Autocommit changes`, false);
program.option('--reload-cache', `Use LLM models even if cached `, false);
program.option('--verbose', `Is verbose`, false);

program.parse(process.argv);
const { commit: isCommited, reloadCache: isCacheReloaded, verbose: isVerbose } = program.opts();

generateSampleJsons({ isCommited, isCacheReloaded, isVerbose })
    .catch((error) => {
        console.error(colors.bgRed(error.name /* <- 11:11 */));
        console.error(colors.red(error.stack || error.message));
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

async function generateSampleJsons({
    isCommited,
    isCacheReloaded,
    isVerbose,
}: {
    isCommited: boolean;
    isCacheReloaded: boolean;
    isVerbose: boolean;
}) {
    console.info(`🏭📖  Convert samples .ptbk.md -> .ptbk.json`);

    if (isCommited && !(await isWorkingTreeClean(process.cwd()))) {
        throw new Error(`Working tree is not clean`);
    }

    const llmTools = getLlmToolsForTestingAndScriptsAndPlayground({ isCacheReloaded, isVerbose });
    //                 <- Note: for example here we don`t want the [🌯]

    const pipelineMarkdownFilePaths = await glob(join(PROMPTBOOK_SAMPLES_DIR, '*.ptbk.md').split('\\').join('/'));

    /*/
    // Note: Keep for testing:
    pipelineMarkdownFilePaths = pipelineMarkdownFilePaths.filter((path) => path.includes('simple-knowledge.ptbk.md'));
    /**/

    for (const pipelineMarkdownFilePath of pipelineMarkdownFilePaths) {
        const pipelineMarkdown = await readFile(pipelineMarkdownFilePath, 'utf-8');

        try {
            const pipelineJson = await pipelineStringToJson(pipelineMarkdown as PipelineString, {
                llmTools,
            });

            await forTime(0);

            /*/
            // Note: Keep for testing:
            console.info(colors.cyan(usageToHuman(llmTools.getTotalUsage())));
            await forTime(1000000);
            /**/

            const pipelineJsonFilePath = pipelineMarkdownFilePath.replace(/\.ptbk\.md$/, '.ptbk.json');

            // Note: We want to ensure that the generated JSONs are logically correct
            validatePipeline(pipelineJson);

            await writeFile(pipelineJsonFilePath, stringifyPipelineJson(pipelineJson));

            console.info(colors.green(`📖  Generated .ptbk.json from ${pipelineMarkdownFilePath}`));
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

    console.info(colors.cyan(usageToHuman(llmTools.getTotalUsage())));

    if (isCommited) {
        await commit(PROMPTBOOK_SAMPLES_DIR, `📖 Convert samples .ptbk.md -> .ptbk.json`);
    }

    console.info(`[ Done 📖  Convert samples .ptbk.md -> .ptbk.json]`);
}

/**
 * TODO: [🍥] When using current time in `preparations` it changes all .ptbk.json files each time so until some more elegant solution omit the time from prepared pipeline
 */
