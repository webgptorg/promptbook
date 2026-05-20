import colors from 'colors';
import OpenAI from 'openai';
import { assertsError } from '../../errors/assertsError';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import type { AvailableModel } from '../../execution/AvailableModel';
import type { CompletionPromptResult, EmbeddingPromptResult, ImagePromptResult } from '../../execution/PromptResult';
import type { Usage } from '../../execution/Usage';
import { computeUsageCounts } from '../../execution/utils/computeUsageCounts';
import { uncertainNumber } from '../../execution/utils/uncertainNumber';
import type { Prompt } from '../../types/Prompt';
import type { string_markdown_text } from '../../types/string_markdown';
import type { string_title } from '../../types/string_title';
import type { string_date_iso8601 } from '../../types/string_token';
import { $getCurrentDate } from '../../utils/misc/$getCurrentDate';
import type { TODO_any } from '../../utils/organization/TODO_any';
import { templateParameters } from '../../utils/parameters/templateParameters';
import { exportJson } from '../../utils/serialization/exportJson';
import type { computeOpenAiUsage } from './computeOpenAiUsage';
import { OpenAiCompatibleUnsupportedParameterRetrier } from './utils/OpenAiCompatibleUnsupportedParameterRetrier';

/**
 * Dependencies required to run non-chat OpenAI-compatible prompt variants.
 */
type OpenAiCompatibleNonChatPromptCallerOptions = {
    readonly getTitle: () => string_title & string_markdown_text;
    readonly isVerbose: boolean | undefined;
    readonly userId: string | number | undefined;
    readonly getClient: () => Promise<OpenAI>;
    readonly executeRateLimitedRequest: <T>(requestFn: () => Promise<T>) => Promise<T>;
    readonly computeUsage: (...args: Parameters<typeof computeOpenAiUsage>) => Usage;
    readonly getDefaultCompletionModel: () => AvailableModel;
    readonly getDefaultEmbeddingModel: () => AvailableModel;
    readonly getDefaultImageGenerationModel: () => AvailableModel;
    readonly getHardcodedModels: () => ReadonlyArray<AvailableModel>;
};

/**
 * Creates a deep clone of JSON-serializable prompt payloads.
 */
function cloneSerializableValue<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
}

/**
 * Executes completion, embedding, and image-generation prompts for OpenAI-compatible providers.
 *
 * @private helper of `OpenAiCompatibleExecutionTools`
 */
export class OpenAiCompatibleNonChatPromptCaller {
    public constructor(private readonly options: OpenAiCompatibleNonChatPromptCallerOptions) {}

    /**
     * Calls one OpenAI-compatible completion model.
     */
    public async callCompletionModel(
        prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements'>,
    ): Promise<CompletionPromptResult> {
        const clonedPrompt = cloneSerializableValue(prompt);
        return this.callCompletionModelWithRetry(
            clonedPrompt,
            clonedPrompt.modelRequirements,
            new OpenAiCompatibleUnsupportedParameterRetrier(this.options.isVerbose),
        );
    }

    /**
     * Calls one OpenAI-compatible embedding model.
     */
    public async callEmbeddingModel(
        prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements'>,
    ): Promise<EmbeddingPromptResult> {
        const clonedPrompt = cloneSerializableValue(prompt);
        return this.callEmbeddingModelWithRetry(
            clonedPrompt,
            clonedPrompt.modelRequirements,
            new OpenAiCompatibleUnsupportedParameterRetrier(this.options.isVerbose),
        );
    }

    /**
     * Calls one OpenAI-compatible image-generation model.
     */
    public async callImageGenerationModel(prompt: Prompt): Promise<ImagePromptResult> {
        const clonedPrompt = cloneSerializableValue(prompt);
        return this.callImageGenerationModelWithRetry(
            clonedPrompt,
            clonedPrompt.modelRequirements,
            new OpenAiCompatibleUnsupportedParameterRetrier(this.options.isVerbose),
        );
    }

    /**
     * Retries completion requests while stripping unsupported model parameters.
     */
    private async callCompletionModelWithRetry(
        prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements'>,
        currentModelRequirements: Pick<Prompt, 'modelRequirements'>['modelRequirements'],
        unsupportedParameterRetrier: OpenAiCompatibleUnsupportedParameterRetrier,
    ): Promise<CompletionPromptResult> {
        const title = this.options.getTitle();

        if (this.options.isVerbose) {
            console.info(`🖋 ${title} callCompletionModel call`, { prompt, currentModelRequirements });
        }

        const { content, parameters } = prompt;
        const client = await this.options.getClient();

        if (currentModelRequirements.modelVariant !== 'COMPLETION') {
            throw new PipelineExecutionError('Use callCompletionModel only for COMPLETION variant');
        }

        const modelName = currentModelRequirements.modelName || this.options.getDefaultCompletionModel().modelName;
        const modelSettings: Partial<OpenAI.Completions.CompletionCreateParamsNonStreaming> = {
            model: modelName,
            max_tokens: currentModelRequirements.maxTokens,
            temperature: currentModelRequirements.temperature,
        };

        const rawPromptContent = templateParameters(content, { ...parameters, modelName });
        const rawRequest: OpenAI.Completions.CompletionCreateParamsNonStreaming = {
            ...modelSettings,
            model: modelName,
            prompt: rawPromptContent,
            user: this.options.userId?.toString(),
        } as OpenAI.Completions.CompletionCreateParamsNonStreaming;
        const start: string_date_iso8601 = $getCurrentDate();

        if (this.options.isVerbose) {
            console.info(colors.bgWhite('rawRequest'), JSON.stringify(rawRequest, null, 4));
        }

        try {
            const turnStart: string_date_iso8601 = $getCurrentDate();
            const rawResponse = await this.options.executeRateLimitedRequest(() =>
                client.completions.create(rawRequest),
            );
            const turnComplete: string_date_iso8601 = $getCurrentDate();

            if (this.options.isVerbose) {
                console.info(colors.bgWhite('rawResponse'), JSON.stringify(rawResponse, null, 4));
            }

            if (!rawResponse.choices[0]) {
                throw new PipelineExecutionError(`No choises from ${title}`);
            }

            if (rawResponse.choices.length > 1) {
                throw new PipelineExecutionError(`More than one choise from ${title}`);
            }

            const resultContent = rawResponse.choices[0].text;
            const duration = uncertainNumber((new Date(turnComplete).getTime() - new Date(turnStart).getTime()) / 1000);
            const usage = this.options.computeUsage(content || '', resultContent || '', rawResponse, duration);

            return exportJson({
                name: 'promptResult',
                message: `Result of \`OpenAiCompatibleExecutionTools.callCompletionModel\``,
                order: [],
                value: {
                    content: resultContent,
                    modelName: rawResponse.model || modelName,
                    timing: {
                        start,
                        complete: turnComplete,
                    },
                    usage,
                    rawPromptContent,
                    rawRequest,
                    rawResponse,
                },
            });
        } catch (error) {
            assertsError(error);

            const modifiedModelRequirements = unsupportedParameterRetrier.resolveRetryOrThrow({
                error,
                modelName,
                currentModelRequirements,
            });

            return this.callCompletionModelWithRetry(prompt, modifiedModelRequirements, unsupportedParameterRetrier);
        }
    }

    /**
     * Retries embedding requests while stripping unsupported model parameters.
     */
    private async callEmbeddingModelWithRetry(
        prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements'>,
        currentModelRequirements: Pick<Prompt, 'modelRequirements'>['modelRequirements'],
        unsupportedParameterRetrier: OpenAiCompatibleUnsupportedParameterRetrier,
    ): Promise<EmbeddingPromptResult> {
        const title = this.options.getTitle();

        if (this.options.isVerbose) {
            console.info(`🖋 ${title} embedding call`, { prompt, currentModelRequirements });
        }

        const { content, parameters } = prompt;
        const client = await this.options.getClient();

        if (currentModelRequirements.modelVariant !== 'EMBEDDING') {
            throw new PipelineExecutionError('Use embed only for EMBEDDING variant');
        }

        const modelName = currentModelRequirements.modelName || this.options.getDefaultEmbeddingModel().modelName;
        const rawPromptContent = templateParameters(content, { ...parameters, modelName });
        const rawRequest: OpenAI.Embeddings.EmbeddingCreateParams = {
            input: rawPromptContent,
            model: modelName,
        };
        const start: string_date_iso8601 = $getCurrentDate();

        if (this.options.isVerbose) {
            console.info(colors.bgWhite('rawRequest'), JSON.stringify(rawRequest, null, 4));
        }

        try {
            const turnStart: string_date_iso8601 = $getCurrentDate();
            const rawResponse = await this.options.executeRateLimitedRequest(() =>
                client.embeddings.create(rawRequest),
            );
            const turnComplete: string_date_iso8601 = $getCurrentDate();

            if (this.options.isVerbose) {
                console.info(colors.bgWhite('rawResponse'), JSON.stringify(rawResponse, null, 4));
            }

            if (rawResponse.data.length !== 1) {
                throw new PipelineExecutionError(
                    `Expected exactly 1 data item in response, got ${rawResponse.data.length}`,
                );
            }

            const resultContent = rawResponse.data[0]!.embedding;
            const duration = uncertainNumber((new Date(turnComplete).getTime() - new Date(turnStart).getTime()) / 1000);
            const usage = this.options.computeUsage(content || '', '', rawResponse, duration);

            return exportJson({
                name: 'promptResult',
                message: `Result of \`OpenAiCompatibleExecutionTools.callEmbeddingModel\``,
                order: [],
                value: {
                    content: resultContent,
                    modelName: rawResponse.model || modelName,
                    timing: {
                        start,
                        complete: turnComplete,
                    },
                    usage,
                    rawPromptContent,
                    rawRequest,
                    rawResponse,
                },
            });
        } catch (error) {
            assertsError(error);

            const modifiedModelRequirements = unsupportedParameterRetrier.resolveRetryOrThrow({
                error,
                modelName,
                currentModelRequirements,
            });

            return this.callEmbeddingModelWithRetry(prompt, modifiedModelRequirements, unsupportedParameterRetrier);
        }
    }

    /**
     * Retries image-generation requests while stripping unsupported model parameters.
     */
    private async callImageGenerationModelWithRetry(
        prompt: Prompt,
        currentModelRequirements: Prompt['modelRequirements'],
        unsupportedParameterRetrier: OpenAiCompatibleUnsupportedParameterRetrier,
    ): Promise<ImagePromptResult> {
        const title = this.options.getTitle();

        if (this.options.isVerbose) {
            console.info(`🎨 ${title} callImageGenerationModel call`, { prompt, currentModelRequirements });
        }

        const { content, parameters } = prompt;
        const client = await this.options.getClient();

        if (currentModelRequirements.modelVariant !== 'IMAGE_GENERATION') {
            throw new PipelineExecutionError('Use callImageGenerationModel only for IMAGE_GENERATION variant');
        }

        const modelName = currentModelRequirements.modelName || this.options.getDefaultImageGenerationModel().modelName;
        const modelSettings: Partial<OpenAI.Images.ImageGenerateParams> = {
            model: modelName,
            size: currentModelRequirements.size as OpenAI.Images.ImageGenerateParams['size'],
            quality: currentModelRequirements.quality as OpenAI.Images.ImageGenerateParams['quality'],
            style: currentModelRequirements.style as OpenAI.Images.ImageGenerateParams['style'],
        };

        let rawPromptContent = templateParameters(content, { ...parameters, modelName });

        if ('attachments' in prompt && Array.isArray(prompt.attachments) && prompt.attachments.length > 0) {
            rawPromptContent +=
                '\n\n' + prompt.attachments.map((attachment) => `Image attachment: ${attachment.url}`).join('\n');
        }

        const rawRequest: OpenAI.Images.ImageGenerateParams = {
            ...modelSettings,
            prompt: rawPromptContent,
            size: (modelSettings.size as OpenAI.Images.ImageGenerateParams['size']) || '1024x1024',
            user: this.options.userId?.toString(),
            response_format: 'url',
        } as OpenAI.Images.ImageGenerateParams;
        const start: string_date_iso8601 = $getCurrentDate();

        if (this.options.isVerbose) {
            console.info(colors.bgWhite('rawRequest'), JSON.stringify(rawRequest, null, 4));
        }

        try {
            const turnStart: string_date_iso8601 = $getCurrentDate();
            const rawResponse = await this.options.executeRateLimitedRequest(() => client.images.generate(rawRequest));
            const turnComplete: string_date_iso8601 = $getCurrentDate();

            if (this.options.isVerbose) {
                console.info(colors.bgWhite('rawResponse'), JSON.stringify(rawResponse, null, 4));
            }

            if (!(rawResponse as TODO_any).data[0]) {
                throw new PipelineExecutionError(`No choises from ${title}`);
            }

            if ((rawResponse as TODO_any).data.length > 1) {
                throw new PipelineExecutionError(`More than one choise from ${title}`);
            }

            const resultContent = (rawResponse as TODO_any).data[0].url!;
            const modelInfo = this.options.getHardcodedModels().find((model) => model.modelName === modelName);
            const price = modelInfo?.pricing?.output ? uncertainNumber(modelInfo.pricing.output) : uncertainNumber();
            const duration = uncertainNumber((new Date(turnComplete).getTime() - new Date(turnStart).getTime()) / 1000);

            return exportJson({
                name: 'promptResult',
                message: `Result of \`OpenAiCompatibleExecutionTools.callImageGenerationModel\``,
                order: [],
                value: {
                    content: resultContent,
                    modelName: modelName,
                    timing: {
                        start,
                        complete: turnComplete,
                    },
                    usage: {
                        price,
                        duration,
                        input: {
                            tokensCount: uncertainNumber(0),
                            ...computeUsageCounts(rawPromptContent),
                        },
                        output: {
                            tokensCount: uncertainNumber(0),
                            ...computeUsageCounts(''),
                        },
                    },
                    rawPromptContent,
                    rawRequest,
                    rawResponse,
                },
            });
        } catch (error) {
            assertsError(error);

            const modifiedModelRequirements = unsupportedParameterRetrier.resolveRetryOrThrow({
                error,
                modelName,
                currentModelRequirements,
            });

            return this.callImageGenerationModelWithRetry(
                prompt,
                modifiedModelRequirements,
                unsupportedParameterRetrier,
            );
        }
    }
}
