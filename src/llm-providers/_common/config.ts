import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { TODO_any } from '../../utils/organization/TODO_any';
import { createAnthropicClaudeExecutionTools } from '../anthropic-claude/createAnthropicClaudeExecutionTools';
import { AzureOpenAiExecutionTools } from '../azure-openai/AzureOpenAiExecutionTools';
import { createOpenaiExecutionTools } from '../openai/createOpenAiExecutionTools';

/**
 * @@@
 *
 * TODO: !!!!!! Not centralized - register each provider to each package
 *
 * @private internal type for `createLlmToolsFromConfiguration`
 */
export const EXECUTION_TOOLS_CLASSES: Record<`create${string}`, (options: TODO_any) => LlmExecutionTools> = {
    createOpenaiExecutionTools,
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
