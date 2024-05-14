import colors from 'colors';
import OpenAI from 'openai';
import type { Promisable } from 'type-fest';
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
    public listModels(): Promisable<Array<AvailableModel>> {
        return [
            // TODO: !!!! [🕚] Make this list dynamic
            {
                modelTitle: 'GPT 3.5 Turbo',
                modelName: 'gpt-3.5-turbo',
                modelVariant: 'COMPLETION',
            },
            {
                modelTitle: 'GPT 4 Turbo',
                modelName: 'gpt-4-turbo',
                modelVariant: 'CHAT',
            },
            {
                modelTitle: 'GPT 4o',
                modelName: 'gpt-4o',
                modelVariant: 'CHAT',
            },
        ];
    }
}

/**
 * TODO: [🍓][♐] Allow to list compatible models with each variant
 * TODO: Maybe Create some common util for gptChat and gptComplete
 * TODO: Maybe make custom OpenaiError
 */
