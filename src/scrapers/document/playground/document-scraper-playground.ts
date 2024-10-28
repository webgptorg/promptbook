#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import colors from 'colors'; // <- TODO: [🔶] Make system to put color and style to both node and browser
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { stringifyPipelineJson } from '../../../conversion/utils/stringifyPipelineJson';
import { usageToHuman } from '../../../execution/utils/usageToHuman';
import { $provideLlmToolsForTestingAndScriptsAndPlayground } from '../../../llm-providers/_common/register/$provideLlmToolsForTestingAndScriptsAndPlayground';
import { $provideExecutablesForNode } from '../../_common/register/$provideExecutablesForNode';
import { $provideFilesystemForNode } from '../../_common/register/$provideFilesystemForNode';
import { makeKnowledgeSourceHandler } from '../../_common/utils/makeKnowledgeSourceHandler';
import { DocumentScraper } from '../DocumentScraper';

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

    //const sample = '10-simple.docx';
    const sample = '10-simple.odt';
    //               <- TODO: [👩🏿‍🤝‍👩🏼] Read here the samples directory and itterate through all of them

    const llmTools = $provideLlmToolsForTestingAndScriptsAndPlayground({ isCacheReloaded: true });
    const rootDirname = join(__dirname, '..', 'samples');

    const documentScraper = new DocumentScraper(
        {
            fs: $provideFilesystemForNode(),
            llm: $provideLlmToolsForTestingAndScriptsAndPlayground(),
            executables: await $provideExecutablesForNode(),
        },
        {
            rootDirname,
        },
    );

    const knowledge = await documentScraper.scrape(
        await makeKnowledgeSourceHandler(
            { sourceContent: sample },
            { fs: $provideFilesystemForNode() },
            { rootDirname },
        ),
    );

    console.info(colors.cyan(usageToHuman(llmTools.getTotalUsage())));
    console.info(colors.bgGreen(' Knowledge: '));
    console.info(knowledge);

    await writeFile(
        join(
            __dirname,
            `../samples/${sample}.knowledge.json` /* <- TODO: [👩🏿‍🤝‍👩🏼] Read here the samples directory and itterate through all of them */,
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
