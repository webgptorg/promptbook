#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import chalk from 'colors';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { getLlmToolsForTestingAndScriptsAndPlayground } from '../../_common/utils/getLlmToolsForTestingAndScriptsAndPlayground';

import { prepareKnowledgeFromMarkdown } from '../prepareKnowledgeFromMarkdown';

const isVerbose = true;

playground()
    .catch((error) => {
        console.error(chalk.bgRed(error.name || 'NamelessError'));
        console.error(error);
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

async function playground() {
    console.info(`🧸  Prepare knowledge from Markdown (playground)`);

    // Do here stuff you want to test
    //========================================>

    const content = await readFile(
        join(
            __dirname,
            '../samples/10-simple.md' /* <- !!! Read here the samples directory and itterate through all of them */,
        ),
        'utf-8',
    );

    const llmTools = getLlmToolsForTestingAndScriptsAndPlayground();

    const knowledge = await prepareKnowledgeFromMarkdown(content, {
        llmTools,
        isVerbose,
    });

    console.info(chalk.bgGreen(' Knowledge: '));
    console.info(knowledge);

    await writeFile(
        join(
            __dirname,
            '../samples/10-simple.knowledge.json' /* <- !!! Read here the samples directory and itterate through all of them */,
        ),
        JSON.stringify(knowledge, null, 4) + '\n',
        'utf-8',
    );
    /**/

    //========================================/
}
