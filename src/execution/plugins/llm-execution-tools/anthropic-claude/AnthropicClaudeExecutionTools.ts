import Anthropic from '@anthropic-ai/sdk';
import type { MessageCreateParamsNonStreaming } from '@anthropic-ai/sdk/resources';
import colors from 'colors';
import { PromptbookExecutionError } from '../../../../errors/PromptbookExecutionError';
import type { Prompt } from '../../../../types/Prompt';
import type { string_date_iso8601 } from '../../../../types/typeAliases';
import { getCurrentIsoDate } from '../../../../utils/getCurrentIsoDate';
import { just } from '../../../../utils/just';
import type { AvailableModel, LlmExecutionTools } from '../../../LlmExecutionTools';
import type { PromptChatResult, PromptCompletionResult, PromptResultUsage } from '../../../PromptResult';
import { computeUsageCounts } from '../../../utils/computeUsageCounts';
import { ANTHROPIC_CLAUDE_MODELS } from './anthropic-claude-models';
import type { AnthropicClaudeExecutionToolsOptions } from './AnthropicClaudeExecutionToolsOptions';
import { uncertainNumber } from '../../../utils/uncertainNumber';

/**
 * Execution Tools for calling Anthropic Claude API.
 */
export class AnthropicClaudeExecutionTools implements LlmExecutionTools {
    /**
     * Anthropic Claude API client.
     */
    private readonly client: Anthropic;

    /**
     * Creates Anthropic Claude Execution Tools.
     *
     * @param options which are relevant are directly passed to the Anthropic Claude client
     */
    public constructor(private readonly options: AnthropicClaudeExecutionToolsOptions) {
        // Note: Passing only Anthropic Claude relevant options to Anthropic constructor
        const anthropicOptions = { ...options };
        delete anthropicOptions.isVerbose;
        this.client = new Anthropic(anthropicOptions);
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

        const rawRequest: MessageCreateParamsNonStreaming = {
            model: modelRequirements.modelName || this.getDefaultChatModel().modelName,
            max_tokens: modelRequirements.maxTokens || 4096,
            //                                            <- TODO: Make some global max cap for maxTokens
            messages: [
                {
                    role: 'user',
                    content,
                },
            ],
            // TODO: Is here some equivalent of user identification?> user: this.options.user,
        };
        const start: string_date_iso8601 = getCurrentIsoDate();
        let complete: string_date_iso8601;

        if (this.options.isVerbose) {
            console.info(colors.bgWhite('rawRequest'), JSON.stringify(rawRequest, null, 4));
        }
        const rawResponse = await this.client.messages.create(rawRequest);
        if (this.options.isVerbose) {
            console.info(colors.bgWhite('rawResponse'), JSON.stringify(rawResponse, null, 4));
        }

        if (!rawResponse.content[0]) {
            throw new PromptbookExecutionError('No content from Anthropic Claude');
        }

        if (rawResponse.content.length > 1) {
            throw new PromptbookExecutionError('More than one content blocks from Anthropic Claude');
        }

        const resultContent = rawResponse.content[0].text;
        // eslint-disable-next-line prefer-const
        complete = getCurrentIsoDate();
        const usage = {
            price: { value: 0, isUncertain: true } /* <- TODO: [🐞] Compute usage */,
            input: {
                tokensCount: uncertainNumber(rawResponse.usage.input_tokens),
                ...computeUsageCounts(prompt.content),
            },
            output: {
                tokensCount: uncertainNumber(rawResponse.usage.output_tokens),
                ...computeUsageCounts(prompt.content),
            },
        } satisfies PromptResultUsage;

        if (!resultContent) {
            throw new PromptbookExecutionError('No response message from Anthropic Claude');
        }

        return {
            content: resultContent,
            modelName: rawResponse.model,
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
        just(prompt);
        throw new Error('Anthropic complation models are not implemented to Promptbook yet [👏]');
        /*
        TODO: [👏]
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
        const usage = { price: 'UNKNOWN', inputTokens: 0, outputTokens: 0 /* <- TODO: [🐞] Compute usage * / } satisfies PromptResultUsage;

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
        */
    }

    /**
     * Default model for chat variant.
     */
    private getDefaultChatModel(): AvailableModel {
        return ANTHROPIC_CLAUDE_MODELS.find(({ modelName }) => modelName.startsWith('claude-3-opus'))!;
    }

    /**
     * List all available Anthropic Claude models that can be used
     */
    public listModels(): Array<AvailableModel> {
        return ANTHROPIC_CLAUDE_MODELS;
    }
}

/**
 * TODO: [🧠] Maybe handle errors via transformAnthropicError (like transformAzureError)
 * TODO: Maybe Create some common util for gptChat and gptComplete
 * TODO: Maybe make custom OpenaiError
 */
