import Bottleneck from 'bottleneck';
import colors from 'colors'; // <- TODO: [🔶] Make system to put color and style to both node and browser
import type { ClientOptions } from 'openai';
import OpenAI from 'openai';
import spaceTrim from 'spacetrim';
import { DEFAULT_MAX_REQUESTS_PER_MINUTE } from '../../config';
import { assertsError } from '../../errors/assertsError';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import type { AvailableModel } from '../../execution/AvailableModel';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { ChatPromptResult } from '../../execution/PromptResult';
import type { CompletionPromptResult } from '../../execution/PromptResult';
import type { EmbeddingPromptResult } from '../../execution/PromptResult';
import type { Usage } from '../../execution/Usage';
import type { Prompt } from '../../types/Prompt';
import type { string_date_iso8601 } from '../../types/typeAliases';
import type { string_markdown } from '../../types/typeAliases';
import type { string_markdown_text } from '../../types/typeAliases';
import type { string_model_name } from '../../types/typeAliases';
import type { string_title } from '../../types/typeAliases';
import { $getCurrentDate } from '../../utils/$getCurrentDate';
import type { really_any } from '../../utils/organization/really_any';
import { templateParameters } from '../../utils/parameters/templateParameters';
import { exportJson } from '../../utils/serialization/exportJson';
import { computeOpenAiUsage } from './computeOpenAiUsage';
import type { OpenAiExecutionToolsOptions } from './OpenAiExecutionToolsOptions';

/**
 * Execution Tools for calling OpenAI API or other OpeenAI compatible provider
 *
 * @public exported from `@promptbook/openai`
 */
export abstract class OpenAiCompatibleExecutionTools implements LlmExecutionTools /* <- TODO: [🍚] `, Destroyable` */ {
    /**
     * OpenAI API client.
     */
    private client: OpenAI | null = null;

    /**
     * Rate limiter instance
     */
    private limiter: Bottleneck;

    /**
     * Creates OpenAI compatible Execution Tools.
     *
     * @param options which are relevant are directly passed to the OpenAI compatible client
     */
    public constructor(protected readonly options: OpenAiExecutionToolsOptions) {
        // TODO: Allow configuring rate limits via options
        this.limiter = new Bottleneck({
            minTime: 60_000 / (this.options.maxRequestsPerMinute || DEFAULT_MAX_REQUESTS_PER_MINUTE),
        });
    }

    public abstract get title(): string_title & string_markdown_text;

    public abstract get description(): string_markdown;

    public async getClient(): Promise<OpenAI> {
        if (this.client === null) {
            // Note: Passing only OpenAI relevant options to OpenAI constructor
            const openAiOptions: really_any = { ...this.options };
            delete openAiOptions.isVerbose;
            delete openAiOptions.userId;

            this.client = new OpenAI(openAiOptions as ClientOptions);
        }

        return this.client;
    }

    /**
     * Check the `options` passed to `constructor`
     */
    public async checkConfiguration(): Promise<void> {
        await this.getClient();
        // TODO: [🎍] Do here a real check that API is online, working and API key is correct
    }

    /**
     * List all available OpenAI compatible models that can be used
     */
    public async listModels(): Promise<ReadonlyArray<AvailableModel>> {
        const client = await this.getClient();
        const rawModelsList = await client.models.list();

        const availableModels = rawModelsList.data
            .sort((a, b) => (a.created > b.created ? 1 : -1))
            .map((modelFromApi) => {
                const modelFromList = this.HARDCODED_MODELS.find(
                    ({ modelName }) =>
                        modelName === modelFromApi.id ||
                        modelName.startsWith(modelFromApi.id) ||
                        modelFromApi.id.startsWith(modelName),
                );

                if (modelFromList !== undefined) {
                    return modelFromList;
                }

                return {
                    modelVariant: 'CHAT', // <- TODO: Is it correct to assume that listed models are chat models?
                    modelTitle: modelFromApi.id,
                    modelName: modelFromApi.id,
                    modelDescription: '',
                } satisfies AvailableModel;
            });

        return availableModels;
    }

    /**
     * Calls OpenAI compatible API to use a chat model.
     */
    public async callChatModel(
        prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements' | 'format'>,
    ): Promise<ChatPromptResult> {
        if (this.options.isVerbose) {
            console.info(`💬 ${this.title} callChatModel call`, { prompt });
        }

        const { content, parameters, modelRequirements, format } = prompt;

        const client = await this.getClient();

        // TODO: [☂] Use here more modelRequirements
        if (modelRequirements.modelVariant !== 'CHAT') {
            throw new PipelineExecutionError('Use callChatModel only for CHAT variant');
        }

        const modelName = modelRequirements.modelName || this.getDefaultChatModel().modelName;
        const modelSettings = {
            model: modelName,
            max_tokens: modelRequirements.maxTokens,
            //                                   <- TODO: [🌾] Make some global max cap for maxTokens

            temperature: modelRequirements.temperature,

            // <- TODO: [🈁] Use `seed` here AND/OR use is `isDeterministic` for entire execution tools
            // <- Note: [🧆]
        } as OpenAI.Chat.Completions.CompletionCreateParamsNonStreaming; // <- TODO: [💩] Guard here types better

        if (format === 'JSON') {
            modelSettings.response_format = {
                type: 'json_object',
            };
        }

        // <- TODO: [🚸] Not all models are compatible with JSON mode
        //        > 'response_format' of type 'json_object' is not supported with this model.

        const rawPromptContent = templateParameters(content, { ...parameters, modelName });
        const rawRequest: OpenAI.Chat.Completions.CompletionCreateParamsNonStreaming = {
            ...modelSettings,
            messages: [
                ...(modelRequirements.systemMessage === undefined
                    ? []
                    : ([
                          {
                              role: 'system',
                              content: modelRequirements.systemMessage,
                          },
                      ] as const)),
                {
                    role: 'user',
                    content: rawPromptContent,
                },
            ],
            user: this.options.userId?.toString(),
        };
        const start: string_date_iso8601 = $getCurrentDate();

        if (this.options.isVerbose) {
            console.info(colors.bgWhite('rawRequest'), JSON.stringify(rawRequest, null, 4));
        }
        const rawResponse = await this.limiter
            .schedule(() => client.chat.completions.create(rawRequest))
            .catch((error) => {
                assertsError(error);
                if (this.options.isVerbose) {
                    console.info(colors.bgRed('error'), error);
                }
                throw error;
            });
        if (this.options.isVerbose) {
            console.info(colors.bgWhite('rawResponse'), JSON.stringify(rawResponse, null, 4));
        }
        const complete: string_date_iso8601 = $getCurrentDate();

        if (!rawResponse.choices[0]) {
            throw new PipelineExecutionError(`No choises from ${this.title}`);
        }

        if (rawResponse.choices.length > 1) {
            // TODO: This should be maybe only warning
            throw new PipelineExecutionError(`More than one choise from ${this.title}`);
        }

        const resultContent = rawResponse.choices[0].message.content;
        const usage = this.computeUsage(content || '', resultContent || '', rawResponse);

        if (resultContent === null) {
            throw new PipelineExecutionError(`No response message from ${this.title}`);
        }

        return exportJson({
            name: 'promptResult',
            message: `Result of \`OpenAiCompatibleExecutionTools.callChatModel\``,
            order: [],
            value: {
                content: resultContent,
                modelName: rawResponse.model || modelName,
                timing: {
                    start,
                    complete,
                },
                usage,
                rawPromptContent,
                rawRequest,
                rawResponse,
                // <- [🗯]
            },
        });
    }

    /**
     * Calls OpenAI API to use a complete model.
     */
    public async callCompletionModel(
        prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements'>,
    ): Promise<CompletionPromptResult> {
        if (this.options.isVerbose) {
            console.info(`🖋 ${this.title} callCompletionModel call`, { prompt });
        }

        const { content, parameters, modelRequirements } = prompt;

        const client = await this.getClient();

        // TODO: [☂] Use here more modelRequirements
        if (modelRequirements.modelVariant !== 'COMPLETION') {
            throw new PipelineExecutionError('Use callCompletionModel only for COMPLETION variant');
        }

        const modelName = modelRequirements.modelName || this.getDefaultCompletionModel().modelName;
        const modelSettings = {
            model: modelName,
            max_tokens: modelRequirements.maxTokens || 2000, // <- Note: [🌾] 2000 is for lagacy reasons
            //                                                  <- TODO: [🌾] Make some global max cap for maxTokens
            temperature: modelRequirements.temperature,

            // <- TODO: [🈁] Use `seed` here AND/OR use is `isDeterministic` for entire execution tools
            // <- Note: [🧆]
        };

        const rawPromptContent = templateParameters(content, { ...parameters, modelName });
        const rawRequest: OpenAI.Completions.CompletionCreateParamsNonStreaming = {
            ...modelSettings,
            prompt: rawPromptContent,
            user: this.options.userId?.toString(),
        };
        const start: string_date_iso8601 = $getCurrentDate();

        if (this.options.isVerbose) {
            console.info(colors.bgWhite('rawRequest'), JSON.stringify(rawRequest, null, 4));
        }
        const rawResponse = await this.limiter
            .schedule(() => client.completions.create(rawRequest))
            .catch((error) => {
                assertsError(error);
                if (this.options.isVerbose) {
                    console.info(colors.bgRed('error'), error);
                }
                throw error;
            });
        if (this.options.isVerbose) {
            console.info(colors.bgWhite('rawResponse'), JSON.stringify(rawResponse, null, 4));
        }
        const complete: string_date_iso8601 = $getCurrentDate();

        if (!rawResponse.choices[0]) {
            throw new PipelineExecutionError(`No choises from ${this.title}`);
        }

        if (rawResponse.choices.length > 1) {
            // TODO: This should be maybe only warning
            throw new PipelineExecutionError(`More than one choise from ${this.title}`);
        }

        const resultContent = rawResponse.choices[0].text;
        const usage = this.computeUsage(content || '', resultContent || '', rawResponse);

        return exportJson({
            name: 'promptResult',
            message: `Result of \`OpenAiCompatibleExecutionTools.callCompletionModel\``,
            order: [],
            value: {
                content: resultContent,
                modelName: rawResponse.model || modelName,
                timing: {
                    start,
                    complete,
                },
                usage,
                rawPromptContent,
                rawRequest,
                rawResponse,
                // <- [🗯]
            },
        });
    }

    /**
     * Calls OpenAI compatible API to use a embedding model
     */
    public async callEmbeddingModel(
        prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements'>,
    ): Promise<EmbeddingPromptResult> {
        if (this.options.isVerbose) {
            console.info(`🖋 ${this.title} embedding call`, { prompt });
        }

        const { content, parameters, modelRequirements } = prompt;

        const client = await this.getClient();

        // TODO: [☂] Use here more modelRequirements
        if (modelRequirements.modelVariant !== 'EMBEDDING') {
            throw new PipelineExecutionError('Use embed only for EMBEDDING variant');
        }

        const modelName = modelRequirements.modelName || this.getDefaultEmbeddingModel().modelName;

        const rawPromptContent = templateParameters(content, { ...parameters, modelName });
        const rawRequest: OpenAI.Embeddings.EmbeddingCreateParams = {
            input: rawPromptContent,
            model: modelName,
        };

        const start: string_date_iso8601 = $getCurrentDate();

        if (this.options.isVerbose) {
            console.info(colors.bgWhite('rawRequest'), JSON.stringify(rawRequest, null, 4));
        }
        const rawResponse = await this.limiter
            .schedule(() => client.embeddings.create(rawRequest))
            .catch((error) => {
                assertsError(error);
                if (this.options.isVerbose) {
                    console.info(colors.bgRed('error'), error);
                }
                throw error;
            });
        if (this.options.isVerbose) {
            console.info(colors.bgWhite('rawResponse'), JSON.stringify(rawResponse, null, 4));
        }
        const complete: string_date_iso8601 = $getCurrentDate();

        if (rawResponse.data.length !== 1) {
            throw new PipelineExecutionError(
                `Expected exactly 1 data item in response, got ${rawResponse.data.length}`,
            );
        }

        const resultContent = rawResponse.data[0]!.embedding;

        const usage = this.computeUsage(
            content || '',
            '',
            // <- Note: Embedding does not have result content
            rawResponse,
        );

        return exportJson({
            name: 'promptResult',
            message: `Result of \`OpenAiCompatibleExecutionTools.callEmbeddingModel\``,
            order: [],
            value: {
                content: resultContent,
                modelName: rawResponse.model || modelName,
                timing: {
                    start,
                    complete,
                },
                usage,
                rawPromptContent,
                rawRequest,
                rawResponse,
                // <- [🗯]
            },
        });
    }

    // <- Note: [🤖] callXxxModel

    /**
     * Get the model that should be used as default
     */
    protected getDefaultModel(defaultModelName: string_model_name): AvailableModel {
        // Note: Match exact or prefix for model families
        const model = this.HARDCODED_MODELS.find(
            ({ modelName }) => modelName === defaultModelName || modelName.startsWith(defaultModelName),
        );

        if (model === undefined) {
            throw new PipelineExecutionError(
                spaceTrim(
                    (block) =>
                        `
                            Cannot find model in ${
                                this.title
                            } models with name "${defaultModelName}" which should be used as default.

                            Available models:
                            ${block(this.HARDCODED_MODELS.map(({ modelName }) => `- "${modelName}"`).join('\n'))}

                            Model "${defaultModelName}" is probably not available anymore, not installed, inaccessible or misconfigured.

                        `,
                ),
            );
        }
        return model;
    }

    /**
     * List all available models (non dynamically)
     *
     * Note: Purpose of this is to provide more information about models than standard listing from API
     */
    protected abstract get HARDCODED_MODELS(): ReadonlyArray<AvailableModel>;

    /**
     * Computes the usage of the OpenAI API based on the response from OpenAI Compatible API
     */
    protected abstract computeUsage(...args: Parameters<typeof computeOpenAiUsage>): Usage;

    /**
     * Default model for chat variant.
     */
    protected abstract getDefaultChatModel(): AvailableModel;

    /**
     * Default model for completion variant.
     */
    protected abstract getDefaultCompletionModel(): AvailableModel;

    /**
     * Default model for completion variant.
     */
    protected abstract getDefaultEmbeddingModel(): AvailableModel;
    // <- Note: [🤖] getDefaultXxxModel
}

/**
 * TODO: [🛄] Some way how to re-wrap the errors from `OpenAiCompatibleExecutionTools`
 * TODO: [🛄] Maybe make custom `OpenAiCompatibleError`
 * TODO: [🧠][🈁] Maybe use `isDeterministic` from options
 * TODO: [🧠][🌰] Allow to pass `title` for tracking purposes
 */
