'use server';

import { OpenAiAssistantExecutionTools } from '@promptbook-local/openai';
import { JavascriptExecutionTools } from '../../../../src/scripting/javascript/JavascriptExecutionTools';
import { send_email } from './send_email';

/**
 * Cache of provided OpenAiAssistantExecutionTools
 *
 * @private internal cache for `$provideOpenAiAssistantExecutionToolsForServer`
 */
let llmExecutionTools: null | OpenAiAssistantExecutionTools = null;

/**
 * [🐱‍🚀]
 */
export async function $provideOpenAiAssistantExecutionToolsForServer(): Promise<OpenAiAssistantExecutionTools> {
    // TODO: [🐱‍🚀] [🌕] DRY
    const isVerbose = true; // <- TODO: [🐱‍🚀] Pass

    if (llmExecutionTools !== null) {
        console.log('[🐱‍🚀] Returning cached OpenAiAssistantExecutionTools');
        return llmExecutionTools;
        // TODO: [🐱‍🚀] Be aware of options changes
    }

    console.log('[🐱‍🚀] Creating NEW OpenAiAssistantExecutionTools');

    llmExecutionTools = new OpenAiAssistantExecutionTools({
        apiKey: process.env.OPENAI_API_KEY,
        assistantId: 'abstract_assistant', // <- TODO: [🙎] In `OpenAiAssistantExecutionTools` Allow to create abstract assistants with `isCreatingNewAssistantsAllowed`
        executionTools: {
            script: new JavascriptExecutionTools({
                isVerbose,
                functions: {
                    // Provide the send_email tool function for the USE EMAIL commitment
                    send_email,
                },
            }),
        },
        isCreatingNewAssistantsAllowed: true,
        isVerbose,
    });

    return llmExecutionTools;
}
