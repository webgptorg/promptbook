'use server';

import type { OpenAiAgentExecutionTools } from '@promptbook-local/openai';
import { $provideOpenAiAgentExecutionToolsForServer } from './$provideOpenAiAgentExecutionToolsForServer';

/**
 * @deprecated Use `$provideOpenAiAgentExecutionToolsForServer` instead.
 */
export async function $provideOpenAiAssistantExecutionToolsForServer(): Promise<OpenAiAgentExecutionTools> {
    return $provideOpenAiAgentExecutionToolsForServer();
}
