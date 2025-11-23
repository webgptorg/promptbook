'use server';

import { OpenAiAssistantExecutionTools } from '@promptbook-local/openai';

/**
 * Cache of provided OpenAiAssistantExecutionTools
 *
 * @private internal cache for `$provideOpenAiAssistantExecutionToolsForServer`
 */
let executionTools: null | OpenAiAssistantExecutionTools = null;

/**
 * !!!!
 */
export async function $provideOpenAiAssistantExecutionToolsForServer(): Promise<OpenAiAssistantExecutionTools> {
    // TODO: !!!! [🌕] DRY
    const isVerbose = true; // <- TODO: !!!! Pass

    if (executionTools !== null) {
        console.log('!!! Returning cached OpenAiAssistantExecutionTools');
        return executionTools;
        // TODO: !!!! Be aware of options changes
    }

    console.log('!!! Creating NEW OpenAiAssistantExecutionTools');

    executionTools = new OpenAiAssistantExecutionTools({
        apiKey: process.env.OPENAI_API_KEY,
        assistantId: 'abstract_assistant', // <- TODO: !!!! In `OpenAiAssistantExecutionTools` Allow to create abstract assistants with `isCreatingNewAssistantsAllowed`
        isCreatingNewAssistantsAllowed: true,
        isVerbose,
    });

    return executionTools;
}
