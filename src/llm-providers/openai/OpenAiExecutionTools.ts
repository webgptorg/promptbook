import colors from 'colors';
import OpenAI from 'openai';
import spaceTrim from 'spacetrim';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import { UnexpectedError } from '../../errors/UnexpectedError';
import type { AvailableModel, LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { ChatPromptResult, CompletionPromptResult, EmbeddingPromptResult } from '../../execution/PromptResult';
import type { Prompt } from '../../types/Prompt';
import type {
    string_date_iso8601,
    string_markdown,
    string_markdown_text,
    string_model_name,
    string_title,
} from '../../types/typeAliases';
import { getCurrentIsoDate } from '../../utils/getCurrentIsoDate';
import { replaceParameters } from '../../utils/replaceParameters';
import { computeOpenaiUsage } from './computeOpenaiUsage';
import { OPENAI_MODELS } from './openai-models';
import type { OpenAiExecutionToolsOptions } from './OpenAiExecutionToolsOptions';

/**
 * Execution Tools for calling OpenAI API.
 *
 * @public exported from `@promptbook/openai`
 */
export class OpenAiExecutionTools implements LlmExecutionTools {
    /**
     * OpenAI API client.
     */
    private readonly client: OpenAI;

    /**
     * Creates OpenAI Execution Tools.
     *
     * @param options which are relevant are directly passed to the OpenAI client
     */
    public constructor(private readonly options: OpenAiExecutionToolsOptions = {}) {
        // Note: Passing only OpenAI relevant options to OpenAI constructor
        const openAiOptions = { ...options };
        delete openAiOptions.isVerbose;
        delete openAiOptions.user;
        this.client = new OpenAI({
            ...openAiOptions,
        });
    }

    public get title(): string_title & string_markdown_text {
        return 'OpenAI';
    }

    public get description(): string_markdown {
        return 'Use all models provided by OpenAI';
    }

    /**
     * Calls OpenAI API to use a chat model.
     */
    public async callChatModel(
        prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements' | 'expectFormat'>,
    ): Promise<ChatPromptResult> {
        if (this.options.isVerbose) {
            console.info('💬 OpenAI callChatModel call', { prompt });
        }

        const { content, parameters, modelRequirements, expectFormat } = prompt;

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
        } as OpenAI.Chat.Completions.CompletionCreateParamsNonStreaming; // <- TODO: Guard here types better

        if (expectFormat === 'JSON') {
            modelSettings.response_format = {
                type: 'json_object',
            };
        }

        // <- TODO: [🚸] Not all models are compatible with JSON mode
        //        > 'response_format' of type 'json_object' is not supported with this model.

        const rawPromptContent = replaceParameters(content, { ...parameters, modelName });
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
            user: this.options.user,
        };
        const start: string_date_iso8601 = getCurrentIsoDate();
        let complete: string_date_iso8601;

        if (this.options.isVerbose) {
            console.info(colors.bgWhite('rawRequest'), JSON.stringify(rawRequest, null, 4));
        }
        const rawResponse = await this.client.chat.completions.create(rawRequest);
        if (this.options.isVerbose) {
            console.info(colors.bgWhite('rawResponse'), JSON.stringify(rawResponse, null, 4));
        }

        if (!rawResponse.choices[0]) {
            throw new PipelineExecutionError('No choises from OpenAI');
        }

        if (rawResponse.choices.length > 1) {
            // TODO: This should be maybe only warning
            throw new PipelineExecutionError('More than one choise from OpenAI');
        }

        const resultContent = rawResponse.choices[0].message.content;
        // eslint-disable-next-line prefer-const
        complete = getCurrentIsoDate();
        const usage = computeOpenaiUsage(content, resultContent || '', rawResponse);

        if (resultContent === null) {
            throw new PipelineExecutionError('No response message from OpenAI');
        }

        return {
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
        };
    }

    /**
     * Calls OpenAI API to use a complete model.
     */
    public async callCompletionModel(
        prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements'>,
    ): Promise<CompletionPromptResult> {
        if (this.options.isVerbose) {
            console.info('🖋 OpenAI callCompletionModel call', { prompt });
        }

        const { content, parameters, modelRequirements } = prompt;

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

        const rawPromptContent = replaceParameters(content, { ...parameters, modelName });
        const rawRequest: OpenAI.Completions.CompletionCreateParamsNonStreaming = {
            ...modelSettings,
            prompt: rawPromptContent,
            user: this.options.user,
        };
        const start: string_date_iso8601 = getCurrentIsoDate();
        let complete: string_date_iso8601;

        if (this.options.isVerbose) {
            console.info(colors.bgWhite('rawRequest'), JSON.stringify(rawRequest, null, 4));
        }
        const rawResponse = await this.client.completions.create(rawRequest);
        if (this.options.isVerbose) {
            console.info(colors.bgWhite('rawResponse'), JSON.stringify(rawResponse, null, 4));
        }

        if (!rawResponse.choices[0]) {
            throw new PipelineExecutionError('No choises from OpenAI');
        }

        if (rawResponse.choices.length > 1) {
            // TODO: This should be maybe only warning
            throw new PipelineExecutionError('More than one choise from OpenAI');
        }

        const resultContent = rawResponse.choices[0].text;
        // eslint-disable-next-line prefer-const
        complete = getCurrentIsoDate();
        const usage = computeOpenaiUsage(content, resultContent || '', rawResponse);

        return {
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
        };
    }

    /**
     * Calls OpenAI API to use a embedding model
     */
    public async callEmbeddingModel(
        prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements'>,
    ): Promise<EmbeddingPromptResult> {
        if (this.options.isVerbose) {
            console.info('🖋 OpenAI embedding call', { prompt });
        }

        const { content, parameters, modelRequirements } = prompt;

        // TODO: [☂] Use here more modelRequirements
        if (modelRequirements.modelVariant !== 'EMBEDDING') {
            throw new PipelineExecutionError('Use embed only for EMBEDDING variant');
        }

        const modelName = modelRequirements.modelName || this.getDefaultEmbeddingModel().modelName;

        const rawPromptContent = replaceParameters(content, { ...parameters, modelName });
        const rawRequest: OpenAI.Embeddings.EmbeddingCreateParams = {
            input: rawPromptContent,
            model: modelName,
        };

        const start: string_date_iso8601 = getCurrentIsoDate();
        let complete: string_date_iso8601;

        if (this.options.isVerbose) {
            console.info(colors.bgWhite('rawRequest'), JSON.stringify(rawRequest, null, 4));
        }

        const rawResponse = await this.client.embeddings.create(rawRequest);

        if (this.options.isVerbose) {
            console.info(colors.bgWhite('rawResponse'), JSON.stringify(rawResponse, null, 4));
        }

        if (rawResponse.data.length !== 1) {
            throw new PipelineExecutionError(
                `Expected exactly 1 data item in response, got ${rawResponse.data.length}`,
            );
        }

        const resultContent = rawResponse.data[0]!.embedding;

        // eslint-disable-next-line prefer-const
        complete = getCurrentIsoDate();
        const usage = computeOpenaiUsage(content, '', rawResponse);

        return {
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
        };
    }

    // <- Note: [🤖] callXxxModel

    /**
     * Get the model that should be used as default
     */
    private getDefaultModel(defaultModelName: string_model_name): AvailableModel {
        const model = OPENAI_MODELS.find(({ modelName }) => modelName === defaultModelName);
        if (model === undefined) {
            throw new UnexpectedError(
                spaceTrim(
                    (block) =>
                        `
                            Cannot find model in OpenAI models with name "${defaultModelName}" which should be used as default.

                            Available models:
                            ${block(OPENAI_MODELS.map(({ modelName }) => `- "${modelName}"`).join('\n'))}

                        `,
                ),
            );
        }
        return model;
    }

    /**
     * Default model for chat variant.
     */
    private getDefaultChatModel(): AvailableModel {
        return this.getDefaultModel('gpt-4o');
    }

    /**
     * Default model for completion variant.
     */
    private getDefaultCompletionModel(): AvailableModel {
        return this.getDefaultModel('gpt-3.5-turbo-instruct');
    }

    /**
     * Default model for completion variant.
     */
    private getDefaultEmbeddingModel(): AvailableModel {
        return this.getDefaultModel('text-embedding-3-large');
    }

    // <- Note: [🤖] getDefaultXxxModel

    /**
     * List all available OpenAI models that can be used
     */
    public listModels(): Array<AvailableModel> {
        /*
        Note: Dynamic lising of the models
        const models = await this.openai.models.list({});

        console.log({ models });
        console.log(models.data);
        */

        return OPENAI_MODELS;
    }
}

/**
 * TODO: [🧠][🧙‍♂️] Maybe there can be some wizzard for thoose who want to use just OpenAI
 * TODO: Maybe Create some common util for callChatModel and callCompletionModel
 * TODO: Maybe make custom OpenaiError
 * TODO: [🧠][🈁] Maybe use `isDeterministic` from options
 * TODO: [🧠][🌰] Allow to pass `title` for tracking purposes
 */
