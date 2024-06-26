import spaceTrim from 'spacetrim';
import type { AvailableModel } from '../../execution/LlmExecutionTools';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { PromptChatResult } from '../../execution/PromptResult';
import type { PromptCompletionResult } from '../../execution/PromptResult';
import type { PromptResult } from '../../execution/PromptResult';
import type { Prompt } from '../../types/Prompt';

/**
 * Multiple LLM Execution Tools is a proxy server that uses multiple execution tools internally and exposes the executor interface externally.
 *
 * @see https://github.com/webgptorg/promptbook#multiple-server
 */
export class MultipleLlmExecutionTools implements LlmExecutionTools {
    /**
     * Array of execution tools in order of priority
     */
    private llmExecutionTools: Array<LlmExecutionTools>;

    /**
     * Gets array of execution tools in order of priority
     */
    public constructor(...llmExecutionTools: Array<LlmExecutionTools>) {
        this.llmExecutionTools = llmExecutionTools;
    }

    /**
     * Calls the best available chat model
     */
    public gptChat(prompt: Prompt): Promise<PromptChatResult> {
        return this.gptCommon(prompt) as Promise<PromptChatResult>;
    }

    /**
     * Calls the best available completion model
     */
    public gptComplete(prompt: Prompt): Promise<PromptCompletionResult> {
        return this.gptCommon(prompt) as Promise<PromptChatResult>;
    }

    /**
     * Calls the best available model
     */
    private async gptCommon(prompt: Prompt): Promise<PromptResult> {
        const errors: Array<Error> = [];

        for (const llmExecutionTools of this.llmExecutionTools) {
            try {
                if (prompt.modelRequirements.modelVariant === 'CHAT') {
                    return await llmExecutionTools.gptChat(prompt);
                } else if (prompt.modelRequirements.modelVariant === 'COMPLETION') {
                    return await llmExecutionTools.gptComplete(prompt);
                }
            } catch (error) {
                if (!(error instanceof Error)) {
                    throw error;
                }

                errors.push(error);
            }
        }

        throw new Error(
            spaceTrim(
                (block) => `
                  All execution tools failed:
                  
                  ${block(errors.map((error) => `- ${error.name || 'Error'}: ${error.message}`).join('\n'))}
            
            `,
            ),
        );
    }

    /**
     * List all available models that can be used
     * This liost is a combination of all available models from all execution tools
     */
    public async listModels(): Promise<Array<AvailableModel>> {
        const availableModels: Array<AvailableModel> = [];

        for (const llmExecutionTools of this.llmExecutionTools) {
            // TODO: Obtain models in parallel
            const models = await llmExecutionTools.listModels();
            availableModels.push(...models);
        }

        return availableModels;
    }
}
