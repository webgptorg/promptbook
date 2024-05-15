import colors from 'colors';
import OpenAI from 'openai';
import { PromptbookExecutionError } from '../../../../errors/PromptbookExecutionError';
import type { Prompt } from '../../../../types/Prompt';
import type { string_date_iso8601 } from '../../../../types/typeAliases';
import { getCurrentIsoDate } from '../../../../utils/getCurrentIsoDate';
import type { AvailableModel, LlmExecutionTools } from '../../../LlmExecutionTools';
import type { PromptChatResult, PromptCompletionResult } from '../../../PromptResult';
import type { OpenAiExecutionToolsOptions } from './OpenAiExecutionToolsOptions';
import { computeOpenaiUsage } from './computeOpenaiUsage';

/**
 * Execution Tools for calling OpenAI API.
 */
export class OpenAiExecutionTools implements LlmExecutionTools {
    /**
     * OpenAI API client.
     */
    private readonly openai: OpenAI;

    /**
     * Creates OpenAI Execution Tools.
     *
     * @param options which are relevant are directly passed to the OpenAI client
     */
    public constructor(private readonly options: OpenAiExecutionToolsOptions) {
        // Note: Passing only OpenAI relevant options to OpenAI constructor
        const openAiOptions = { ...options };
        delete openAiOptions.isVerbose;
        delete openAiOptions.user;
        this.openai = new OpenAI({
            ...openAiOptions,
        });
    }

    /**
     * Calls OpenAI API to use a chat model.
     */
    public async gptChat(prompt: Prompt): Promise<PromptChatResult> {
        if (this.options.isVerbose) {
            console.info('💬 OpenAI gptChat call');
        }

        const { content, modelRequirements } = prompt;

        // TODO: [☂] Use here more modelRequirements
        if (modelRequirements.modelVariant !== 'CHAT') {
            throw new PromptbookExecutionError('Use gptChat only for CHAT variant');
        }

        const model = modelRequirements.modelName;
        const modelSettings = {
            model,
            max_tokens: modelRequirements.maxTokens,
            //                                      <- TODO: Make some global max cap for maxTokens
        };
        const rawRequest: OpenAI.Chat.Completions.CompletionCreateParamsNonStreaming = {
            ...modelSettings,
            messages: [
                {
                    role: 'user',
                    content,
                },
            ],
            user: this.options.user,
        };
        const start: string_date_iso8601 = getCurrentIsoDate();
        let complete: string_date_iso8601;

        if (this.options.isVerbose) {
            console.info(colors.bgWhite('rawRequest'), JSON.stringify(rawRequest, null, 4));
        }
        const rawResponse = await this.openai.chat.completions.create(rawRequest);
        if (this.options.isVerbose) {
            console.info(colors.bgWhite('rawResponse'), JSON.stringify(rawResponse, null, 4));
        }

        if (!rawResponse.choices[0]) {
            throw new PromptbookExecutionError('No choises from OpenAI');
        }

        if (rawResponse.choices.length > 1) {
            // TODO: This should be maybe only warning
            throw new PromptbookExecutionError('More than one choise from OpenAI');
        }

        const resultContent = rawResponse.choices[0].message.content;
        // eslint-disable-next-line prefer-const
        complete = getCurrentIsoDate();
        const usage = computeOpenaiUsage(rawResponse);

        if (!resultContent) {
            throw new PromptbookExecutionError('No response message from OpenAI');
        }

        return {
            content: resultContent,
            model,
            timing: {
                start,
                complete,
            },
            usage,
            rawResponse,
            // <- [🤹‍♂️]
        };
    }

    /**
     * Calls OpenAI API to use a complete model.
     */
    public async gptComplete(prompt: Prompt): Promise<PromptCompletionResult> {
        if (this.options.isVerbose) {
            console.info('🖋 OpenAI gptComplete call');
        }

        const { content, modelRequirements } = prompt;

        // TODO: [☂] Use here more modelRequirements
        if (modelRequirements.modelVariant !== 'COMPLETION') {
            throw new PromptbookExecutionError('Use gptComplete only for COMPLETION variant');
        }

        const model = modelRequirements.modelName;
        const modelSettings = {
            model,
            max_tokens: modelRequirements.maxTokens || 2000, // <- Note: 2000 is for lagacy reasons
            //                                                  <- TODO: Make some global max cap for maxTokens
        };

        const rawRequest: OpenAI.Completions.CompletionCreateParamsNonStreaming = {
            ...modelSettings,
            prompt: content,
            user: this.options.user,
        };
        const start: string_date_iso8601 = getCurrentIsoDate();
        let complete: string_date_iso8601;

        if (this.options.isVerbose) {
            console.info(colors.bgWhite('rawRequest'), JSON.stringify(rawRequest, null, 4));
        }
        const rawResponse = await this.openai.completions.create(rawRequest);
        if (this.options.isVerbose) {
            console.info(colors.bgWhite('rawResponse'), JSON.stringify(rawResponse, null, 4));
        }

        if (!rawResponse.choices[0]) {
            throw new PromptbookExecutionError('No choises from OpenAI');
        }

        if (rawResponse.choices.length > 1) {
            // TODO: This should be maybe only warning
            throw new PromptbookExecutionError('More than one choise from OpenAI');
        }

        const resultContent = rawResponse.choices[0].text;
        // eslint-disable-next-line prefer-const
        complete = getCurrentIsoDate();
        const usage = computeOpenaiUsage(rawResponse);

        if (!resultContent) {
            throw new PromptbookExecutionError('No response message from OpenAI');
        }

        return {
            content: resultContent,
            model,
            timing: {
                start,
                complete,
            },
            usage,
            rawResponse,
            // <- [🤹‍♂️]
        };
    }

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

        return [
          // Note: Done at 2024-05-15
            // TODO: [🕚] Make this list dynamic - dynamically can be listed modelNames but not modelVariant, legacy status, context length and pricing
            // @see https://platform.openai.com/docs/models/gpt-4-turbo-and-gpt-4
            // @see https://openai.com/api/pricing/
            // @see /other/playground/playground.ts
            

            /*/
            {
                modelTitle: 'dall-e-3',
                modelName: 'dall-e-3',
            },
            /**/

            /*/
            {
                modelTitle: 'whisper-1',
                modelName: 'whisper-1',
            },
            /**/

            /**/
            {
                modelVariant: 'COMPLETION',
                modelTitle: 'davinci-002',
                modelName: 'davinci-002',
            },
            /**/

            /*/
            {
                modelTitle: 'dall-e-2',
                modelName: 'dall-e-2',
            },
            /**/

            /**/
            {
                modelVariant: 'CHAT',
                modelTitle: 'gpt-3.5-turbo-16k',
                modelName: 'gpt-3.5-turbo-16k',
            },
            /**/

            /*/
            {
                modelTitle: 'tts-1-hd-1106',
                modelName: 'tts-1-hd-1106',
            },
            /**/

            /*/
            {
                modelTitle: 'tts-1-hd',
                modelName: 'tts-1-hd',
            },
            /**/

            /**/
            {
                modelVariant: 'CHAT',
                modelTitle: 'gpt-4',
                modelName: 'gpt-4',
            },
            /**/

            /**/
            {
                modelVariant: 'CHAT',
                modelTitle: 'gpt-4-0613',
                modelName: 'gpt-4-0613',
            },
            /**/

            /**/
            {
                modelVariant: 'CHAT',
                modelTitle: 'gpt-4-turbo-2024-04-09',
                modelName: 'gpt-4-turbo-2024-04-09',
            },
            /**/

            /**/
            {
                modelVariant: 'CHAT',
                modelTitle: 'gpt-3.5-turbo-1106',
                modelName: 'gpt-3.5-turbo-1106',
            },
            /**/

            /**/
            {
                modelVariant: 'CHAT',
                modelTitle: 'gpt-4-turbo',
                modelName: 'gpt-4-turbo',
            },
            /**/

            /**/
            {
                modelVariant: 'COMPLETION',
                modelTitle: 'gpt-3.5-turbo-instruct-0914',
                modelName: 'gpt-3.5-turbo-instruct-0914',
            },
            /**/

            /**/
            {
                modelVariant: 'COMPLETION',
                modelTitle: 'gpt-3.5-turbo-instruct',
                modelName: 'gpt-3.5-turbo-instruct',
            },
            /**/

            /*/
            {
                modelTitle: 'tts-1',
                modelName: 'tts-1',
            },
            /**/

            /**/
            {
                modelVariant: 'CHAT',
                modelTitle: 'gpt-3.5-turbo',
                modelName: 'gpt-3.5-turbo',
            },
            /**/

            /**/
            {
                modelVariant: 'CHAT',
                modelTitle: 'gpt-3.5-turbo-0301',
                modelName: 'gpt-3.5-turbo-0301',
            },
            /**/

            /**/
            {
                modelVariant: 'COMPLETION',
                modelTitle: 'babbage-002',
                modelName: 'babbage-002',
            },
            /**/

            /**/
            {
                modelVariant: 'CHAT',
                modelTitle: 'gpt-4-1106-preview',
                modelName: 'gpt-4-1106-preview',
            },
            /**/

            /**/
            {
                modelVariant: 'CHAT',
                modelTitle: 'gpt-4-0125-preview',
                modelName: 'gpt-4-0125-preview',
            },
            /**/

            /*/
            {
                modelTitle: 'tts-1-1106',
                modelName: 'tts-1-1106',
            },
            /**/

            /**/
            {
                modelVariant: 'CHAT',
                modelTitle: 'gpt-3.5-turbo-0125',
                modelName: 'gpt-3.5-turbo-0125',
            },
            /**/

            /**/
            {
                modelVariant: 'CHAT',
                modelTitle: 'gpt-4-turbo-preview',
                modelName: 'gpt-4-turbo-preview',
            },
            /**/

            /*/
            {
                modelTitle: 'text-embedding-3-large',
                modelName: 'text-embedding-3-large',
            },
            /**/

            /*/
            {
                modelTitle: 'text-embedding-3-small',
                modelName: 'text-embedding-3-small',
            },
            /**/

            /**/
            {
                modelVariant: 'CHAT',
                modelTitle: 'gpt-3.5-turbo-0613',
                modelName: 'gpt-3.5-turbo-0613',
            },
            /**/

            /*/
            {
                modelTitle: 'text-embedding-ada-002',
                modelName: 'text-embedding-ada-002',
            },
            /**/

            /*/
            {
              modelVariant: 'CHAT',
                modelTitle: 'gpt-4-1106-vision-preview',
                modelName: 'gpt-4-1106-vision-preview',
            },
            /**/

            /*/
            {
                modelTitle: 'gpt-4-vision-preview',
                modelName: 'gpt-4-vision-preview',
            },
            /**/

            /**/
            {
                modelVariant: 'CHAT',
                modelTitle: 'gpt-4o-2024-05-13',
                modelName: 'gpt-4o-2024-05-13',
            },
            /**/

            /**/
            {
                modelVariant: 'CHAT',
                modelTitle: 'gpt-4o',
                modelName: 'gpt-4o',
            },
            /**/

            /**/
            {
                modelVariant: 'CHAT',
                modelTitle: 'gpt-3.5-turbo-16k-0613',
                modelName: 'gpt-3.5-turbo-16k-0613',
            },
            /**/
        ];
    }
}

/**
 * TODO: [🍓][♐] Allow to list compatible models with each variant
 * TODO: Maybe Create some common util for gptChat and gptComplete
 * TODO: Maybe make custom OpenaiError
 */
