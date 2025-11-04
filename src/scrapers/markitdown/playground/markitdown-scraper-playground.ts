#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import { writeFile } from 'fs/promises';
import { join } from 'path';
import colors from 'yoctocolors'; // <- TODO: [🔶] Make system to put color and style to both node and browser
import { $provideExecutablesForNode } from '../../../executables/$provideExecutablesForNode';
import { usageToHuman } from '../../../execution/utils/usageToHuman';
import { $provideLlmToolsForTestingAndScriptsAndPlayground } from '../../../llm-providers/_common/register/$provideLlmToolsForTestingAndScriptsAndPlayground';
import { stringifyPipelineJson } from '../../../utils/editable/utils/stringifyPipelineJson';
import { titleToName } from '../../../utils/normalization/titleToName';
import { isValidUrl } from '../../../utils/validators/url/isValidUrl';
import { $provideFilesystemForNode } from '../../_common/register/$provideFilesystemForNode';
import { makeKnowledgeSourceHandler } from '../../_common/utils/makeKnowledgeSourceHandler';
import { MarkitdownScraper } from '../MarkitdownScraper';

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
    console.info(`🧸  Scrape knowledge by Markitdown (playground)`);

    // Do here stuff you want to test
    //========================================>

    // const example = '10-simple.pdf';
    // const example = 'https://collboard.fra1.cdn.digitaloceanspaces.com/ptbk/user/knowledge-source/4/c/pravidla-pro-zadatele-a-prijemce-3-0.pdf';
    const example = 'https://collboard.fra1.cdn.digitaloceanspaces.com/ptbk/user/knowledge-source/b/d/10-simple.pdf';
    // const example = 'https://collboard.fra1.cdn.digitaloceanspaces.com/ptbk/user/knowledge-source/4/3/10-simple.odt';
    // const example = 'https://collboard.fra1.cdn.digitaloceanspaces.com/ptbk/user/knowledge-source/4/3/10-simple.odt';
    // const example = 'https://collboard.fra1.cdn.digitaloceanspaces.com/ptbk/user/knowledge-source/7/f/10-simple.docx';
    // const example = 'https://collboard.fra1.cdn.digitaloceanspaces.com/ptbk/user/knowledge-source/2/9/10-simple.rtf';
    // const example = 'https://collboard.fra1.cdn.digitaloceanspaces.com/ptbk/user/knowledge-source/f/3/10-simple.doc';

    //               <- TODO: [👩🏿‍🤝‍👩🏼] Read here the examples directory and itterate through all of them

    const llmTools = await $provideLlmToolsForTestingAndScriptsAndPlayground({ isCacheReloaded: true });
    const rootDirname = isValidUrl(example) ? null : join(__dirname, '..', 'examples');

    const markitdownScraper = new MarkitdownScraper(
        {
            fs: $provideFilesystemForNode(),
            llm: await $provideLlmToolsForTestingAndScriptsAndPlayground(),
            executables: await $provideExecutablesForNode(),
        },
        {
            rootDirname,
        },
    );

    const knowledge = await markitdownScraper.scrape(
        await makeKnowledgeSourceHandler(
            { knowledgeSourceContent: example },
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
            `../examples/${
                isValidUrl(example) ? titleToName(example) : example
            }.knowledge.json` /* <- TODO: [👩🏿‍🤝‍👩🏼] Read here the examples directory and itterate through all of them */,
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
