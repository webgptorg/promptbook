#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import colors from 'colors';
import { usageToHuman } from '../../../execution/utils/usageToHuman';
import type { Prompt } from '../../../types/Prompt';
import { keepUnused } from '../../../utils/organization/keepUnused';
import { LangtailExecutionTools } from '../LangtailExecutionTools';

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
    console.info(`🧸  Langtail Playground`);

    // Do here stuff you want to test
    //========================================>

    const langtailExecutionTools = new LangtailExecutionTools(
        //            <- TODO: [🧱] Implement in a functional (not new Class) way
        {
            isVerbose: true,
            apiKey: process.env.LANGTAIL_API_KEY!,
        },
    );

    keepUnused(langtailExecutionTools);
    keepUnused(usageToHuman);
    keepUnused<Prompt>();

    /*/
    //TODO: [🦻] This should work
    const models = await langtailExecutionTools.listModels();
    console.info({ models });
    /**/

    /*/
    // TODO: [🦻] This should work
    const completionPrompt = {
        title: 'Hello',
        parameters: {},
        content: `Hello, my name is Alice.`,
        modelRequirements: {
            modelVariant: 'COMPLETION',
        },
    } as const satisfies Prompt;
    const completionPromptResult = await langtailExecutionTools.callCompletionModel(completionPrompt);
    console.info({ completionPromptResult });
    console.info(colors.cyan(usageToHuman(chatPromptResult.usage)));
    console.info(chalk.green(completionPrompt.content + completionPromptResult.content));
    /**/

    /*/
    // TODO: [🦻] This should work
    const chatPrompt = {
        title: 'Hello',
        parameters: {},
        content: `Hello, my name is Alice.`,
        modelRequirements: {
            modelVariant: 'CHAT',
        },
    } as const satisfies Prompt;
    const chatPromptResult = await langtailExecutionTools.callChatModel(chatPrompt);
    console.info({ chatPromptResult });
    console.info(colors.cyan(usageToHuman(chatPromptResult.usage)));
    console.info(chalk.bgBlue(' User: ') + chalk.blue(chatPrompt.content));
    console.info(chalk.bgGreen(' Completion: ') + chalk.green(chatPromptResult.content));
    /**/

    /*/
    // <- Note: [🤖] Test here new model variant if needed
    /**/

    //========================================/
}
