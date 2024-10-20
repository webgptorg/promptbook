import { AzureKeyCredential, OpenAIClient } from '@azure/openai';
import colors from 'colors';
import { CONNECTION_TIMEOUT_MS } from '../../config';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import { UnexpectedError } from '../../errors/UnexpectedError';
import type { AvailableModel } from '../../execution/AvailableModel';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { ChatPromptResult } from '../../execution/PromptResult';
import type { CompletionPromptResult } from '../../execution/PromptResult';
import type { PromptResultUsage } from '../../execution/PromptResultUsage';
import { computeUsageCounts } from '../../execution/utils/computeUsageCounts';
import { uncertainNumber } from '../../execution/utils/uncertainNumber';
import type { Prompt } from '../../types/Prompt';
import type { string_completion_prompt } from '../../types/typeAliases';
import type { string_date_iso8601 } from '../../types/typeAliases';
import type { string_markdown } from '../../types/typeAliases';
import type { string_markdown_text } from '../../types/typeAliases';
import type { string_title } from '../../types/typeAliases';
import { getCurrentIsoDate } from '../../utils/getCurrentIsoDate';
import { replaceParameters } from '../../utils/parameters/replaceParameters';
import { $asDeeplyFrozenSerializableJson } from '../../utils/serialization/$asDeeplyFrozenSerializableJson';
import { OPENAI_MODELS } from '../openai/openai-models';
import type { AzureOpenAiExecutionToolsOptions } from './AzureOpenAiExecutionToolsOptions';

/**
 * Execution Tools for calling Azure OpenAI API.
 *
 * @public exported from `@promptbook/azure-openai`
 */
export class AzureOpenAiExecutionTools implements LlmExecutionTools /* <- TODO: [🍚] `, Destroyable` */ {
    /**
     * OpenAI Azure API client.
     */
    private client: OpenAIClient | null = null;

    /**
     * Creates OpenAI Execution Tools.
     *
     * @param options which are relevant are directly passed to the OpenAI client
     */
    public constructor(protected readonly options: AzureOpenAiExecutionToolsOptions) {}

    public get title(): string_title & string_markdown_text {
        return 'Azure OpenAI';
    }

    public get description(): string_markdown {
        return 'Use all models trained by OpenAI provided by Azure';
    }

    public async getClient(): Promise<OpenAIClient> {
        if (this.client === null) {
            this.client = new OpenAIClient(
                `https://${this.options.resourceName}.openai.azure.com/`,
                new AzureKeyCredential(this.options.apiKey),
            );
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
     * List all available Azure OpenAI models that can be used
     */
    public async listModels(): Promise<Array<AvailableModel>> {
        // TODO: [main] !!! Do here some filtering which models are really available as deployment
        //       @see https://management.azure.com/subscriptions/subscriptionId/resourceGroups/resourceGroupName/providers/Microsoft.CognitiveServices/accounts/accountName/deployments?api-version=2023-05-01
        return OPENAI_MODELS.map(
            ({
                modelTitle,
                modelName,

                modelVariant,
            }) => ({
                modelTitle: `Azure ${modelTitle}`,
                modelName,
                modelVariant,
            }),
        );
    }

    /**
     * Calls OpenAI API to use a chat model.
     */
    public async callChatModel(
        prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements'>,
    ): Promise<ChatPromptResult> {
        if (this.options.isVerbose) {
            console.info('💬 OpenAI callChatModel call');
        }

        const { content, parameters, modelRequirements } = prompt;

        const client = await this.getClient();

        // TODO: [☂] Use here more modelRequirements
        if (modelRequirements.modelVariant !== 'CHAT') {
            throw new PipelineExecutionError('Use callChatModel only for CHAT variant');
        }

        try {
            const modelName = prompt.modelRequirements.modelName || this.options.deploymentName;
            const modelSettings = {
                maxTokens: modelRequirements.maxTokens,
                //                                      <- TODO: [🌾] Make some global max cap for maxTokens
                temperature: modelRequirements.temperature,
                user: this.options.userId?.toString(),
                // <- TODO: [🈁] Use `seed` here AND/OR use is `isDeterministic` for entire execution tools
                // <- Note: [🧆]
            }; // <- TODO: Guard here types better

            const rawPromptContent = replaceParameters(content, { ...parameters, modelName });
            const messages = [
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
            ];

            const start: string_date_iso8601 = getCurrentIsoDate();
            let complete: string_date_iso8601;

            if (this.options.isVerbose) {
                console.info(colors.bgWhite('messages'), JSON.stringify(messages, null, 4));
            }

            const rawRequest = [modelName, messages, modelSettings] as const;
            const rawResponse = await this.withTimeout(client.getChatCompletions(...rawRequest)).catch((error) => {
                if (this.options.isVerbose) {
                    console.info(colors.bgRed('error'), error);
                }
                throw error;
            });

            if (this.options.isVerbose) {
                console.info(colors.bgWhite('rawResponse'), JSON.stringify(rawResponse, null, 4));
            }

            if (!rawResponse.choices[0]) {
                throw new PipelineExecutionError('No choises from Azure OpenAI');
            }

            if (rawResponse.choices.length > 1) {
                // TODO: This should be maybe only warning
                throw new PipelineExecutionError('More than one choise from Azure OpenAI');
            }

            if (!rawResponse.choices[0].message || !rawResponse.choices[0].message.content) {
                throw new PipelineExecutionError('Empty response from Azure OpenAI');
            }

            const resultContent = rawResponse.choices[0].message.content;
            // eslint-disable-next-line prefer-const
            complete = getCurrentIsoDate();
            const usage = {
                price: uncertainNumber() /* <- TODO: [🐞] Compute usage */,
                input: {
                    tokensCount: uncertainNumber(rawResponse.usage?.promptTokens),
                    ...computeUsageCounts(prompt.content),
                },
                output: {
                    tokensCount: uncertainNumber(rawResponse.usage?.completionTokens),
                    ...computeUsageCounts(prompt.content),
                },
            } satisfies PromptResultUsage; /* <- TODO: [🤛] */

            return $asDeeplyFrozenSerializableJson('AzureOpenAiExecutionTools ChatPromptResult', {
                content: resultContent,
                modelName,
                timing: {
                    start,
                    complete,
                },
                usage,
                rawPromptContent,
                rawRequest,
                rawResponse: {
                    ...rawResponse,
                    created: rawResponse.created.toISOString(),
                    //  <- TODO: Put `created` at begining
                },
                // <- [🗯]
            });
        } catch (error) {
            throw this.transformAzureError(error as { code: string; message: string });
        }
    }

    /**
     * Calls Azure OpenAI API to use a complete model.
     */
    public async callCompletionModel(
        prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements'>,
    ): Promise<CompletionPromptResult> {
        if (this.options.isVerbose) {
            console.info('🖋 OpenAI callCompletionModel call');
        }

        const { content, parameters, modelRequirements } = prompt;

        const client = await this.getClient();

        // TODO: [☂] Use here more modelRequirements
        if (modelRequirements.modelVariant !== 'COMPLETION') {
            throw new PipelineExecutionError('Use callCompletionModel only for COMPLETION variant');
        }

        try {
            const modelName = prompt.modelRequirements.modelName || this.options.deploymentName;
            const modelSettings = {
                maxTokens: modelRequirements.maxTokens || 2000, // <- Note: [🌾] 2000 is for lagacy reasons
                //                                                  <- TODO: [🌾] Make some global max cap for maxTokens
                temperature: modelRequirements.temperature,
                user: this.options.userId?.toString(),
                // <- TODO: [🈁] Use `seed` here AND/OR use is `isDeterministic` for entire execution tools
                // <- Note: [🧆]
            }; // <- TODO: Guard here types better

            const start: string_date_iso8601 = getCurrentIsoDate();
            let complete: string_date_iso8601;

            if (this.options.isVerbose) {
                console.info(colors.bgWhite('content'), JSON.stringify(content, null, 4));
                console.info(colors.bgWhite('parameters'), JSON.stringify(parameters, null, 4));
            }

            const rawPromptContent = replaceParameters(content, { ...parameters, modelName });
            const rawRequest = [
                modelName,
                [rawPromptContent] as Array<string_completion_prompt>,
                modelSettings,
            ] as const;

            const rawResponse = await this.withTimeout(client.getCompletions(...rawRequest)).catch((error) => {
                if (this.options.isVerbose) {
                    console.info(colors.bgRed('error'), error);
                }
                throw error;
            });

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

            const usage = {
                price: uncertainNumber() /* <- TODO: [🐞] Compute usage */,
                input: {
                    tokensCount: uncertainNumber(rawResponse.usage?.promptTokens),
                    ...computeUsageCounts(prompt.content),
                },
                output: {
                    tokensCount: uncertainNumber(rawResponse.usage?.completionTokens),
                    ...computeUsageCounts(prompt.content),
                },
            } satisfies PromptResultUsage; /* <- TODO: [🤛] */

            return $asDeeplyFrozenSerializableJson('AzureOpenAiExecutionTools CompletionPromptResult', {
                content: resultContent,
                modelName,
                timing: {
                    start,
                    complete,
                },
                usage,
                rawPromptContent,
                rawRequest,
                rawResponse: {
                    ...rawResponse,
                    created: rawResponse.created.toISOString(),
                    //  <- TODO: Put `created` at begining
                },
                // <- [🗯]
            });
        } catch (error) {
            throw this.transformAzureError(error as { code: string; message: string });
        }
    }

    // <- Note: [🤖] callXxxModel

    /**
     * Library `@azure/openai` has bug/weird behavior that it does not throw error but hangs forever
     *
     * This method wraps the promise with timeout
     */
    private withTimeout<T>(promise: Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new PipelineExecutionError('Timeout'));
            }, CONNECTION_TIMEOUT_MS);

            promise.then((result) => {
                clearTimeout(timeout);
                resolve(result);
            }, reject);
        });
    }

    /**
     * Changes Azure error (which is not propper Error but object) to propper Error
     */
    private transformAzureError(azureError: { code: string; message: string }): Error {
        if (azureError instanceof UnexpectedError) {
            return azureError;
        }

        if (typeof azureError !== 'object' || azureError === null) {
            return new PipelineExecutionError(`Unknown Azure OpenAI error`);
        }

        const { code, message } = azureError;
        return new PipelineExecutionError(`${code || '(No Azure error code)'}: ${message}`);
    }
}

/**
 * TODO: Maybe Create some common util for callChatModel and callCompletionModel
 * TODO: Maybe make custom AzureOpenAiError
 * TODO: [🧠][🈁] Maybe use `isDeterministic` from options
 * TODO: [🧠][🌰] Allow to pass `title` for tracking purposes
 */
