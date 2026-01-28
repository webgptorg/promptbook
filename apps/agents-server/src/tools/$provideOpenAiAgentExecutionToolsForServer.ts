'use server';

import { OpenAiAgentExecutionTools } from '@promptbook-local/openai';
import { getAllCommitmentsToolFunctionsForNode } from '../../../../src/commitments/_common/getAllCommitmentsToolFunctionsForNode';
import { JavascriptExecutionTools } from '../../../../src/scripting/javascript/JavascriptExecutionTools';

/**
 * Cache of provided OpenAiAgentExecutionTools.
 *
 * @private internal cache for `$provideOpenAiAgentExecutionToolsForServer`
 */
let llmExecutionTools: null | OpenAiAgentExecutionTools = null;

/**
 * Provides OpenAI Responses API execution tools for the Agents Server.
 */
export async function $provideOpenAiAgentExecutionToolsForServer(): Promise<OpenAiAgentExecutionTools> {
    const isVerbose = true; // <- TODO: [🐱‍🚀] Pass

    if (llmExecutionTools !== null) {
        console.log('[🐱‍🚀] Returning cached OpenAiAgentExecutionTools');
        return llmExecutionTools;
        // TODO: [🐱‍🚀] Be aware of options changes
    }

    console.log('[🐱‍🚀] Creating NEW OpenAiAgentExecutionTools');

    llmExecutionTools = new OpenAiAgentExecutionTools({
        apiKey: process.env.OPENAI_API_KEY,
        executionTools: {
            script: new JavascriptExecutionTools({
                isVerbose,
                functions: getAllCommitmentsToolFunctionsForNode(),
            }),
        },
        isVerbose,
    });

    return llmExecutionTools;
}

/**
 * TODO: [🏓] Unite `xxxForServer` and `xxxForNode` naming
 */
