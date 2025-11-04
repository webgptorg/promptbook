#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import colors from 'colors';
import { join } from 'path';
import { LangchainTranspiler } from '../../transpilers/langchain/LangchainTranspiler';
import { $provideExecutablesForNode } from '../../executables/$provideExecutablesForNode';
import { $provideLlmToolsForTestingAndScriptsAndPlayground } from '../../llm-providers/_common/register/$provideLlmToolsForTestingAndScriptsAndPlayground';


if (process.cwd() !== join(__dirname, '../../..')) {
    console.error(colors.red(`CWD must be root of the project`));
    process.exit(1);
}

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
    console.info(`🧸  Transpilers Playground`);

    // Do here stuff you want to test
    //========================================>

    // Note: [🎠] Do here the stuff and add in `terminals.json`





    const llm = await $provideLlmToolsForTestingAndScriptsAndPlayground());
    const transpiler = LangchainTranspiler.new({llm},{isVerbose});


    transpiler.

    //========================================/
}

/**
 * Note: [⚫] Code in this file should never be published in any package
 */
