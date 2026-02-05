'use server';

import { OpenAiAgentKitExecutionTools } from '@promptbook-local/openai';
import { getAllCommitmentsToolFunctionsForNode } from '../../../../src/commitments/_common/getAllCommitmentsToolFunctionsForNode';
import { JavascriptExecutionTools } from '../../../../src/scripting/javascript/JavascriptExecutionTools';

/**
 * Cache of provided OpenAiAgentKitExecutionTools.
 *
 * @private internal cache for `$provideOpenAiAgentKitExecutionToolsForServer`
 */
let llmExecutionTools: null | OpenAiAgentKitExecutionTools = null;

/**
 * Provides OpenAI AgentKit execution tools configured for the Agents Server.
 */
export async function $provideOpenAiAgentKitExecutionToolsForServer(): Promise<OpenAiAgentKitExecutionTools> {
    const isVerbose = true; // <- TODO: [?????] Pass

    if (llmExecutionTools !== null) {
        console.log('[?????] Returning cached OpenAiAgentKitExecutionTools');
        return llmExecutionTools;
        // TODO: [?????] Be aware of options changes
    }

    console.log('[?????] Creating NEW OpenAiAgentKitExecutionTools');

    llmExecutionTools = new OpenAiAgentKitExecutionTools({
        apiKey: process.env.OPENAI_API_KEY,
        agentId: 'abstract_agentkit',
        executionTools: {
            script: new JavascriptExecutionTools({
                isVerbose,
                functions: getAllCommitmentsToolFunctionsForNode(),
            }),
        },
        isCreatingNewAgentsAllowed: true,
        isVerbose,
    });

    return llmExecutionTools;
}

/**
 * TODO: [??] Unite `xxxForServer` and `xxxForNode` naming
 */
