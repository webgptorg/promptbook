import spaceTrim from 'spacetrim';
import type { ChatParticipant } from '../../book-components/Chat/types/ChatParticipant';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import { UnexpectedError } from '../../errors/UnexpectedError';
import { assertsError } from '../../errors/assertsError';
import type { AvailableModel } from '../../execution/AvailableModel';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type {
    ChatPromptResult,
    CompletionPromptResult,
    EmbeddingPromptResult,
    PromptResult,
} from '../../execution/PromptResult';
import type { ChatPrompt, CompletionPrompt, EmbeddingPrompt, Prompt } from '../../types/Prompt';
import type { string_markdown, string_markdown_text, string_name, string_title } from '../../types/typeAliases';
import type { really_any } from '../../utils/organization/really_any';

/**
 * Profile for Multiple providers aggregation
 */
const MULTIPLE_PROVIDER_PROFILE: ChatParticipant = {
    name: 'MULTIPLE' as string_name,
    fullname: 'Multiple Providers',
    color: '#6366f1',
} as const;

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
    public constructor(
        public readonly title: string_title & string_markdown_text,
        ...llmExecutionTools: ReadonlyArray<LlmExecutionTools>
    ) {
        this.llmExecutionTools = llmExecutionTools;
    }

    public get description(): string_markdown {
        const innerModelsTitlesAndDescriptions = this.llmExecutionTools
            .map(({ title, description }, index) => {
                const headLine = `${index + 1}) \`${title}\``;

                if (description === undefined) {
                    return headLine;
                }

                return spaceTrim(
                    (block) => `
                        ${headLine}

                          ${/* <- Note: Indenting the description: */ block(description)}
                    `,
                );
            })
            .join('\n\n');

        return spaceTrim(
            (block) => `
                Multiple LLM Providers:

                ${block(innerModelsTitlesAndDescriptions)}
            `,
        );
    }

    public get profile() {
        return MULTIPLE_PROVIDER_PROFILE;
    }

    /**
     * Check the configuration of all execution tools
     */
    public async checkConfiguration(): Promise<void> {
        // Note: Run checks in parallel
        await Promise.all(this.llmExecutionTools.map((tools) => tools.checkConfiguration()));
    }

    /**
     * List all available models that can be used
     * This lists is a combination of all available models from all execution tools
     */
    public async listModels(): Promise<ReadonlyArray<AvailableModel>> {
        // Obtain all models in parallel and flatten
        const modelArrays = await Promise.all(this.llmExecutionTools.map((tools) => tools.listModels()));
        return modelArrays.flat();
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
        return this.callCommonModel(prompt) as Promise<CompletionPromptResult>;
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
                switch (prompt.modelRequirements.modelVariant) {
                    case 'CHAT':
                        if (llmExecutionTools.callChatModel === undefined) {
                            continue llm;
                        }

                        return await llmExecutionTools.callChatModel(prompt);
                    case 'COMPLETION':
                        if (llmExecutionTools.callCompletionModel === undefined) {
                            continue llm;
                        }

                        return await llmExecutionTools.callCompletionModel(prompt);

                    case 'EMBEDDING':
                        if (llmExecutionTools.callEmbeddingModel === undefined) {
                            continue llm;
                        }

                        return await llmExecutionTools.callEmbeddingModel(prompt);

                    // <- case [🤖]:

                    default:
                        throw new UnexpectedError(
                            `Unknown model variant "${(prompt as really_any).modelRequirements.modelVariant}" in ${
                                llmExecutionTools.title
                            }`,
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
                          All execution tools of ${this.title} failed:

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
            throw new PipelineExecutionError(`You have not provided any \`LlmExecutionTools\` into ${this.title}`);
        } else {
            throw new PipelineExecutionError(
                spaceTrim(
                    (block) => `
                          You have not provided any \`LlmExecutionTools\` that support model variant "${
                              prompt.modelRequirements.modelVariant
                          }" into ${this.title}

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
