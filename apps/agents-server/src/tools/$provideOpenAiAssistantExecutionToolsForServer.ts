'use server';

import { OpenAiAssistantExecutionTools } from '@promptbook-local/openai';
import { getAllCommitmentsToolFunctionsForNode } from '../../../../src/commitments/_common/getAllCommitmentsToolFunctionsForNode';
import { JavascriptExecutionTools } from '../../../../src/scripting/javascript/JavascriptExecutionTools';
import { configureTimeoutToolRuntimeAdapterForServer } from './configureTimeoutToolRuntimeAdapterForServer';

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
    configureTimeoutToolRuntimeAdapterForServer();

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
                functions: getAllCommitmentsToolFunctionsForNode(),
            }),
        },
        isCreatingNewAssistantsAllowed: true,
        isVerbose,
    });

    return llmExecutionTools;
}

/**
 * TODO: [🏓] Unite `xxxForServer` and `xxxForNode` naming
 */
