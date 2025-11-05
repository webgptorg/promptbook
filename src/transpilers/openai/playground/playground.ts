#!/usr/bin/env ts-node

// Note: [❌] Turning off some global checks for playground file:
// spell-checker: disable
/* eslint-disable */

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import colors from 'colors'; // <- TODO: [🔶] Make system to put color and style to both node and browser
import { $provideLlmToolsForTestingAndScriptsAndPlayground } from '../../../llm-providers/_common/register/$provideLlmToolsForTestingAndScriptsAndPlayground';
import { book } from '../../../pipeline/book-notation';
import { OpenAiSdkTranspiler } from '../../../transpilers/openai/OpenAiSdkTranspiler';

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
    console.info(`🧸  Transpile book -> OpenAiSdk`);

    // Do here stuff you want to test
    //========================================>

    // Note: [🎠] Do here the stuff and add in `terminals.json`

    const agentSource = book`
        Poe

        PERSONA You are funny and creative AI assistant
        RULE You write poems as answers
    `;

    const llm = await $provideLlmToolsForTestingAndScriptsAndPlayground();
    const code = await OpenAiSdkTranspiler.transpileBook(agentSource, { llm }, { isVerbose: true });

    console.info(code);

    // <- TODO: !!! Save the file and run it to see it in action

    //========================================/
}

/**
 * Note: [⚫] Code in this file should never be published in any package
 */
