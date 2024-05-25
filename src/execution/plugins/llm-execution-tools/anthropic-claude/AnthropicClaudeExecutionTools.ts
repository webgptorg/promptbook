import colors from 'colors';
import xxxx from 'openai';
import { PromptbookExecutionError } from '../../../../errors/PromptbookExecutionError';
import type { Prompt } from '../../../../types/Prompt';
import type { string_date_iso8601 } from '../../../../types/typeAliases';
import { getCurrentIsoDate } from '../../../../utils/getCurrentIsoDate';
import type { AvailableModel, LlmExecutionTools } from '../../../LlmExecutionTools';
import type { PromptChatResult, PromptCompletionResult } from '../../../PromptResult';
import type { AnthropicClaudeExecutionToolsOptions } from './AnthropicClaudeExecutionToolsOptions';
import { OPENAI_MODELS } from './models';

/**
 * Execution Tools for calling Anthropic Claude API.
 */
export class AnthropicClaudeExecutionTools implements LlmExecutionTools {
    /**
     * Anthropic Claude API client.
     */
    private readonly client: xxxx;

    /**
     * Creates Anthropic Claude Execution Tools.
     *
     * @param options which are relevant are directly passed to the Anthropic Claude client
     */
    public constructor(private readonly options: AnthropicClaudeExecutionToolsOptions) {
        // Note: Passing only Anthropic Claude relevant options to Anthropic Claude constructor
        const openAiOptions = { ...options };
        delete openAiOptions.isVerbose;
        delete openAiOptions.user;
        this.client = new xxxx({
            ...openAiOptions,
        });
    }

    /**
     * Calls Anthropic Claude API to use a chat model.
     */
    public async gptChat(prompt: Pick<Prompt, 'content' | 'modelRequirements'>): Promise<PromptChatResult> {
        if (this.options.isVerbose) {
            console.info('💬 Anthropic Claude gptChat call');
        }

        const { content, modelRequirements } = prompt;

        // TODO: [☂] Use here more modelRequirements
        if (modelRequirements.modelVariant !== 'CHAT') {
            throw new PromptbookExecutionError('Use gptChat only for CHAT variant');
        }

        const model = modelRequirements.modelName || this.getDefaultChatModel().modelName;
        const modelSettings = {
            model: rawResponse.model || model,
            max_tokens: modelRequirements.maxTokens,
            //                                      <- TODO: Make some global max cap for maxTokens
        };
        const rawRequest: xxxx.Chat.Completions.CompletionCreateParamsNonStreaming = {
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
        const rawResponse = await this.client.chat.completions.create(rawRequest);
        if (this.options.isVerbose) {
            console.info(colors.bgWhite('rawResponse'), JSON.stringify(rawResponse, null, 4));
        }

        if (!rawResponse.choices[0]) {
            throw new PromptbookExecutionError('No choises from Anthropic Claude');
        }

        if (rawResponse.choices.length > 1) {
            // TODO: This should be maybe only warning
            throw new PromptbookExecutionError('More than one choise from Anthropic Claude');
        }

        const resultContent = rawResponse.choices[0].message.content;
        // eslint-disable-next-line prefer-const
        complete = getCurrentIsoDate();
        const usage = { price: 'UNKNOWN', inputTokens: 0, outputTokens: 0 /* <- TODO: [🐞] Compute usage */ } as const;

        if (!resultContent) {
            throw new PromptbookExecutionError('No response message from Anthropic Claude');
        }

        return {
            content: resultContent,
            modelName: rawResponse.model || model,
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
     * Calls Anthropic Claude API to use a complete model.
     */
    public async gptComplete(prompt: Pick<Prompt, 'content' | 'modelRequirements'>): Promise<PromptCompletionResult> {
        if (this.options.isVerbose) {
            console.info('🖋 Anthropic Claude gptComplete call');
        }

        const { content, modelRequirements } = prompt;

        // TODO: [☂] Use here more modelRequirements
        if (modelRequirements.modelVariant !== 'COMPLETION') {
            throw new PromptbookExecutionError('Use gptComplete only for COMPLETION variant');
        }

        const model = modelRequirements.modelName || this.getDefaultChatModel().modelName;
        const modelSettings = {
            model: rawResponse.model || model,
            max_tokens: modelRequirements.maxTokens || 2000, // <- Note: 2000 is for lagacy reasons
            //                                                  <- TODO: Make some global max cap for maxTokens
        };

        const rawRequest: xxxx.Completions.CompletionCreateParamsNonStreaming = {
            ...modelSettings,
            prompt: content,
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
            throw new PromptbookExecutionError('No choises from Anthropic Claude');
        }

        if (rawResponse.choices.length > 1) {
            // TODO: This should be maybe only warning
            throw new PromptbookExecutionError('More than one choise from Anthropic Claude');
        }

        const resultContent = rawResponse.choices[0].text;
        // eslint-disable-next-line prefer-const
        complete = getCurrentIsoDate();
        const usage = { price: 'UNKNOWN', inputTokens: 0, outputTokens: 0 /* <- TODO: [🐞] Compute usage */ } as const;

        if (!resultContent) {
            throw new PromptbookExecutionError('No response message from Anthropic Claude');
        }

        return {
            content: resultContent,
            modelName: rawResponse.model || model,
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
     * Default model for chat variant.
     */
    private getDefaultChatModel(): AvailableModel {
        return {
            modelVariant: 'CHAT',
            modelTitle: 'gpt-4o',
            modelName: 'gpt-4o',
        };
    }

    /**
     * Default model for completion variant.
     */
    private getDefaultCompletionModel(): AvailableModel {
        return {
            modelVariant: 'COMPLETION',
            modelTitle: 'gpt-3.5-turbo-instruct',
            modelName: 'gpt-3.5-turbo-instruct',
        };
    }

    /**
     * List all available Anthropic Claude models that can be used
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
 * TODO: [🍓][♐] Allow to list compatible models with each variant
 * TODO: Maybe Create some common util for gptChat and gptComplete
 * TODO: Maybe make custom OpenaiError
 */
