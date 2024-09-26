#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import colors from 'colors';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { stringifyPipelineJson } from '../../../conversion/utils/stringifyPipelineJson';
import { usageToHuman } from '../../../execution/utils/usageToHuman';
import { getLlmToolsForTestingAndScriptsAndPlayground } from '../../../llm-providers/_common/getLlmToolsForTestingAndScriptsAndPlayground';
import { emulateScraperSourceOptions } from '../../_common/utils/emulateScraperSourceOptions';
import { markdownScraper } from '../markdownScraper';

const isVerbose = true;

playground()
    .catch((error) => {
        console.error(colors.bgRed(error.name || 'NamelessError'));
        console.error(error);
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

async function playground() {
    console.info(`🧸  Scrape knowledge from Markdown (playground)`);

    // Do here stuff you want to test
    //========================================>

    const samplePath = join(
        __dirname,
        '../samples/10-simple.md' /* <- TODO: !! Read here the samples directory and itterate through all of them */,
    );

    const llmTools = getLlmToolsForTestingAndScriptsAndPlayground({ isCacheReloaded: true });

    const knowledge = await markdownScraper.scrape(emulateScraperSourceOptions(samplePath), {
        llmTools,
        isVerbose,
        filesystemTools: null,
    });

    console.info(colors.cyan(usageToHuman(llmTools.getTotalUsage())));
    console.info(colors.bgGreen(' Knowledge: '));
    console.info(knowledge);

    await writeFile(
        join(
            __dirname,
            '../samples/10-simple.knowledge.json' /* <- TODO: !! Read here the samples directory and itterate through all of them */,
        ),
        stringifyPipelineJson(knowledge),
        'utf-8',
    );
    /**/

    //========================================/
}

/**
 * Note: [⚫] Code in this file should never be published in any package
 */
