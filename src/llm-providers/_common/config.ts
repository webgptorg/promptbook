import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { TODO_any } from '../../utils/organization/TODO_any';
import { createAnthropicClaudeExecutionTools } from '../anthropic-claude/createAnthropicClaudeExecutionTools';
import { AzureOpenAiExecutionTools } from '../azure-openai/AzureOpenAiExecutionTools';
import { OpenAiExecutionTools } from '../openai/OpenAiExecutionTools';

/**
 * @@@
 * 
 * TODO: !!!!!! Not centralized - register each provider to each package
 * 
 * @private internal type for `createLlmToolsFromConfiguration`
 */
export const EXECUTION_TOOLS_CLASSES: Record<`create${string}`, (options: TODO_any) => LlmExecutionTools> = {
    createOpenAiExecutionTools: (options: TODO_any) =>
        new OpenAiExecutionTools(
            //            <- TODO: [🧱] Implement in a functional (not new Class) way
            {
                ...options,
                dangerouslyAllowBrowser:
                    true /* <- TODO: [🧠] !!! Some mechanism for auto-detection of browser, maybe hide in `OpenAiExecutionTools` */,
            },
        ),
    createAnthropicClaudeExecutionTools,
    createAzureOpenAiExecutionTools: (options: TODO_any) =>
        new AzureOpenAiExecutionTools(
            //            <- TODO: [🧱] Implement in a functional (not new Class) way
            options,
        ),

    // <- Note: [🦑] Add here new LLM provider
};

/**
 * TODO: !!!!!!! Make global register for this
 * TODO: [🧠][🎌] Adding this should be responsibility of each provider package NOT this one central place
 */
