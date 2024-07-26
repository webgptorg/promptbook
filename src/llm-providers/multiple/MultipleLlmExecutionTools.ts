import spaceTrim from 'spacetrim';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import { UnexpectedError } from '../../errors/UnexpectedError';
import type { AvailableModel, LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { PromptChatResult, PromptCompletionResult, PromptEmbeddingResult, PromptResult } from '../../execution/PromptResult';
import type { Prompt } from '../../types/Prompt';
import type { string_markdown, string_markdown_text, string_title } from '../../types/typeAliases';

/**
 * Multiple LLM Execution Tools is a proxy server that uses multiple execution tools internally and exposes the executor interface externally.
 *
 * @private Internal utility of `joinLlmExecutionTools`
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

    public get title(): string_title & string_markdown_text {
        return 'Multiple LLM Providers';
    }

    public get description(): string_markdown {
        return this.llmExecutionTools
            .map((tools, index) => `${index + 1}) ${tools.title} ${tools.description || ''}`)
            .join('\n');
    }

    /**
     * Calls the best available chat model
     */
    public callChatModel(prompt: Prompt): Promise<PromptChatResult> {
        return this.callModelCommon(prompt) as Promise<PromptChatResult>;
    }

    /**
     * Calls the best available completion model
     */
    public callCompletionModel(prompt: Prompt): Promise<PromptCompletionResult> {
        return this.callModelCommon(prompt) as Promise<PromptChatResult>;
    }

    /**
     * Calls the best available embedding model
     */
    public callEmbeddingModel(prompt: Prompt): Promise<PromptEmbeddingResult> {
        return this.callModelCommon(prompt) as Promise<PromptEmbeddingResult>;
    }

    // <- Note: [🤖]

    /**
     * Calls the best available model
     */
    private async callModelCommon(prompt: Prompt): Promise<PromptResult> {
        const errors: Array<Error> = [];

        llm: for (const llmExecutionTools of this.llmExecutionTools) {
            try {
                variant: switch (prompt.modelRequirements.modelVariant) {
                    case 'CHAT':
                        if (llmExecutionTools.callChatModel === undefined) {
                            continue llm;
                        }

                        return await llmExecutionTools.callChatModel(prompt);
                        break variant;
                    case 'COMPLETION':
                        if (llmExecutionTools.callCompletionModel === undefined) {
                            continue llm;
                        }

                        return await llmExecutionTools.callCompletionModel(prompt);
                        break variant;

                    case 'EMBEDDING':
                        if (llmExecutionTools.callEmbeddingModel === undefined) {
                            continue llm;
                        }

                        return await llmExecutionTools.callEmbeddingModel(prompt);
                        break variant;

                    // <- case [🤖]:

                    default:
                        throw new UnexpectedError(`Unknown model variant "${prompt.modelRequirements.modelVariant}"`);
                }
            } catch (error) {
                if (!(error instanceof Error) || error instanceof UnexpectedError) {
                    throw error;
                }

                errors.push(error);
            }
        }

        if (errors.length === 1) {
            throw errors[0];
        } else if (errors.length > 1) {
            throw new PipelineExecutionError(
                spaceTrim(
                    (block) => `
                          All execution tools failed:

                          ${block(errors.map((error) => `- ${error.name || 'Error'}: ${error.message}`).join('\n'))}

                    `,
                ),
            );
        } else {
            throw new PipelineExecutionError(
                spaceTrim(
                    (block) => `
                          No execution tools available for model variant "${prompt.modelRequirements.modelVariant}".

                          tl;dr

                          You have provided no LLM Execution Tools that support model variant "${
                              prompt.modelRequirements.modelVariant
                          }:
                          ${block(
                              this.llmExecutionTools
                                  .map((tools) => `- ${tools.title} ${tools.description || ''}`)
                                  .join('\n'),
                          )}

                    `,
                ),
            );
        }
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

/**
 * TODO: [🧠][🎛] Aggregating multiple models - have result not only from one first aviable model BUT all of them
 */
