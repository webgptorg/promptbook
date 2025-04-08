import spaceTrim from 'spacetrim';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import { UnexpectedError } from '../../errors/UnexpectedError';
import { assertsError } from '../../errors/assertsError';
import type { AvailableModel } from '../../execution/AvailableModel';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { ChatPromptResult } from '../../execution/PromptResult';
import type { CompletionPromptResult } from '../../execution/PromptResult';
import type { EmbeddingPromptResult } from '../../execution/PromptResult';
import type { PromptResult } from '../../execution/PromptResult';
import type { ChatPrompt } from '../../types/Prompt';
import type { CompletionPrompt } from '../../types/Prompt';
import type { EmbeddingPrompt } from '../../types/Prompt';
import type { Prompt } from '../../types/Prompt';
import type { string_markdown } from '../../types/typeAliases';
import type { string_markdown_text } from '../../types/typeAliases';
import type { string_title } from '../../types/typeAliases';
import type { really_any } from '../../utils/organization/really_any';

/**
 * Multiple LLM Execution Tools is a proxy server that uses multiple execution tools internally and exposes the executor interface externally.
 *
 * Note: Internal utility of `joinLlmExecutionTools` but exposed type
 * @public exported from `@promptbook/core`
 */
export class MultipleLlmExecutionTools implements LlmExecutionTools /* <- TODO: [🍚] `, Destroyable` */ {
    /**
     * Array of execution tools in order of priority
     */
    public readonly llmExecutionTools: ReadonlyArray<LlmExecutionTools>;

    /**
     * Gets array of execution tools in order of priority
     */
    public constructor(...llmExecutionTools: ReadonlyArray<LlmExecutionTools>) {
        this.llmExecutionTools = llmExecutionTools;
    }

    public get title(): string_title & string_markdown_text {
        return 'Multiple LLM Providers';
    }

    public get description(): string_markdown {
        return this.llmExecutionTools.map(({ title }, index) => `${index + 1}) \`${title}\``).join('\n');
    }

    /**
     * Check the configuration of all execution tools
     */
    public async checkConfiguration(): Promise<void> {
        // TODO: Maybe do it in parallel
        for (const llmExecutionTools of this.llmExecutionTools) {
            await llmExecutionTools.checkConfiguration();
        }
    }

    /**
     * List all available models that can be used
     * This lists is a combination of all available models from all execution tools
     */
    public async listModels(): Promise<ReadonlyArray<AvailableModel>> {
        const availableModels: Array<AvailableModel> = [];

        for (const llmExecutionTools of this.llmExecutionTools) {
            // TODO: [🪂] Obtain models in parallel
            const models = await llmExecutionTools.listModels();
            availableModels.push(...models);
        }

        return availableModels;
    }

    /**
     * Calls the best available chat model
     */
    public callChatModel(prompt: ChatPrompt): Promise<ChatPromptResult> {
        return this.callCommonModel(prompt) as Promise<ChatPromptResult>;
    }

    /**
     * Calls the best available completion model
     */
    public callCompletionModel(prompt: CompletionPrompt): Promise<CompletionPromptResult> {
        return this.callCommonModel(prompt) as Promise<ChatPromptResult>;
    }

    /**
     * Calls the best available embedding model
     */
    public callEmbeddingModel(prompt: EmbeddingPrompt): Promise<EmbeddingPromptResult> {
        return this.callCommonModel(prompt) as Promise<EmbeddingPromptResult>;
    }

    // <- Note: [🤖]

    /**
     * Calls the best available model
     *
     * Note: This should be private or protected but is public to be usable with duck typing
     */
    public async callCommonModel(prompt: Prompt): Promise<PromptResult> {
        const errors: Array<{ llmExecutionTools: LlmExecutionTools; error: Error }> = [];

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
                        throw new UnexpectedError(
                            `Unknown model variant "${(prompt as really_any).modelRequirements.modelVariant}"`,
                        );
                }
            } catch (error) {
                assertsError(error);

                if (error instanceof UnexpectedError) {
                    throw error;
                }

                errors.push({ llmExecutionTools, error });
            }
        }

        if (errors.length === 1) {
            throw errors[0]!.error;
        } else if (errors.length > 1) {
            throw new PipelineExecutionError(
                // TODO: Tell which execution tools failed like
                //     1) OpenAI throw PipelineExecutionError: Parameter `{knowledge}` is not defined
                //     2) AnthropicClaude throw PipelineExecutionError: Parameter `{knowledge}` is not defined
                //     3) ...
                spaceTrim(
                    (block) => `
                          All execution tools failed:

                          ${block(
                              errors
                                  .map(
                                      ({ error, llmExecutionTools }, i) =>
                                          `${i + 1}) **${llmExecutionTools.title}** thrown **${
                                              error.name || 'Error'
                                          }:** ${error.message}`,
                                  )
                                  .join('\n'),
                          )}

                    `,
                ),
            );
        } else if (this.llmExecutionTools.length === 0) {
            throw new PipelineExecutionError(`You have not provided any \`LlmExecutionTools\``);
        } else {
            throw new PipelineExecutionError(
                spaceTrim(
                    (block) => `
                          You have not provided any \`LlmExecutionTools\` that support model variant "${
                              prompt.modelRequirements.modelVariant
                          }"

                          Available \`LlmExecutionTools\`:
                          ${block(this.description)}

                    `,
                ),
            );
        }
    }
}

/**
 * TODO: [🧠][🎛] Aggregating multiple models - have result not only from one first available model BUT all of them
 * TODO: [🏖] If no llmTools have for example not defined `callCompletionModel` this will still return object with defined `callCompletionModel` which just throws `PipelineExecutionError`, make it undefined instead
 *       Look how `countTotalUsage` (and `cacheLlmTools`) implements it
 */
