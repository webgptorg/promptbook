'use server';

import { getAllCommitmentsToolFunctionsForNode } from '../../../../src/commitments/_common/getAllCommitmentsToolFunctionsForNode';
import { OpenAiAgentKitExecutionTools } from '../../../../src/llm-providers/openai/OpenAiAgentKitExecutionTools';
import { JavascriptExecutionTools } from '../../../../src/scripting/javascript/JavascriptExecutionTools';

/**
 * Cache of provided OpenAiAgentKitExecutionTools.
 *
 * @private internal cache for `$provideOpenAiAgentKitExecutionToolsForServer`
 */
let llmExecutionTools: null | OpenAiAgentKitExecutionTools = null;

/**
 * Provides a cached OpenAiAgentKitExecutionTools instance for the Agents Server.
 */
export async function $provideOpenAiAgentKitExecutionToolsForServer(): Promise<OpenAiAgentKitExecutionTools> {

    const isVerbose = true; // <- TODO: [🤰] Pass

    if (llmExecutionTools !== null) {
        console.log('[🤰] Returning cached OpenAiAgentKitExecutionTools');
        return llmExecutionTools;
        // TODO: [🤰] Be aware of options changes
    }

    console.log('[🤰] Creating NEW OpenAiAgentKitExecutionTools');

    llmExecutionTools = new OpenAiAgentKitExecutionTools({
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
