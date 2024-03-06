import AnthropicClaude from 'anthropicclaude';
import chalk from 'chalk';
import type { Prompt } from '../../../../types/Prompt';
import { string_date_iso8601 } from '../../../../types/typeAliases';
import { getCurrentIsoDate } from '../../../../utils/getCurrentIsoDate';
import type { NaturalExecutionTools } from '../../../NaturalExecutionTools';
import type { PromptChatResult, PromptCompletionResult } from '../../../PromptResult';
import type { AnthropicClaudeExecutionToolsOptions } from './AnthropicClaudeExecutionToolsOptions';
import { computeAnthropicClaudeUsage } from './computeAnthropicClaudeUsage';

// TODO: !!!! Put here claude BOT OpenAI

/**
 * Execution Tools for calling AnthropicClaude API.
 */
export class AnthropicClaudeExecutionTools implements NaturalExecutionTools {
    /**
     * AnthropicClaude API client.
     */
    private readonly anthropicclaude: AnthropicClaude;

    public constructor(private readonly options: AnthropicClaudeExecutionToolsOptions) {
        this.anthropicclaude = new AnthropicClaude({
            apiKey: this.options.anthropicClaudeApiKey,
        });
    }

    /**
     * Calls AnthropicClaude API to use a chat model.
     */
    public async gptChat(prompt: Prompt): Promise<PromptChatResult> {
        if (this.options.isVerbose) {
            console.info('💬 AnthropicClaude gptChat call');
        }

        const { content, modelRequirements } = prompt;

        // TODO: [☂] Use here more modelRequirements
        if (modelRequirements.modelVariant !== 'CHAT') {
            throw new Error('Use gptChat only for CHAT variant');
        }

        const model = modelRequirements.modelName;
        const modelSettings = {
            model,
            max_tokens: modelRequirements.maxTokens,
            //                                      <- TODO: Make some global max cap for maxTokens
        };
        const rawRequest: AnthropicClaude.Chat.Completions.CompletionCreateParamsNonStreaming = {
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
            console.error(chalk.bgGray('rawRequest'), JSON.stringify(rawRequest, null, 4));
        }
        const rawResponse = await this.anthropicclaude.chat.completions.create(rawRequest);
        if (this.options.isVerbose) {
            console.error(chalk.bgGray('rawResponse'), JSON.stringify(rawResponse, null, 4));
        }

        if (!rawResponse.choices[0]) {
            throw new Error('No choises from AnthropicClaude');
        }

        if (rawResponse.choices.length > 1) {
            // TODO: This should be maybe only warning
            throw new Error('More than one choise from AnthropicClaude');
        }

        const resultContent = rawResponse.choices[0].message.content;
        // eslint-disable-next-line prefer-const
        complete = getCurrentIsoDate();
        const usage = computeAnthropicClaudeUsage(rawResponse);

        if (!resultContent) {
            throw new Error('No response message from AnthropicClaude');
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
     * Calls AnthropicClaude API to use a complete model.
     */
    public async gptComplete(prompt: Prompt): Promise<PromptCompletionResult> {
        if (this.options.isVerbose) {
            console.info('🖋 AnthropicClaude gptComplete call');
        }

        const { content, modelRequirements } = prompt;

        // TODO: [☂] Use here more modelRequirements
        if (modelRequirements.modelVariant !== 'COMPLETION') {
            throw new Error('Use gptComplete only for COMPLETION variant');
        }

        const model = modelRequirements.modelName;
        const modelSettings = {
            model,
            max_tokens: modelRequirements.maxTokens || 2000, // <- Note: 2000 is for lagacy reasons
            //                                                  <- TODO: Make some global max cap for maxTokens
        };

        const rawRequest: AnthropicClaude.Completions.CompletionCreateParamsNonStreaming = {
            ...modelSettings,
            prompt: content,
            user: this.options.user,
        };
        const start: string_date_iso8601 = getCurrentIsoDate();
        let complete: string_date_iso8601;

        if (this.options.isVerbose) {
            console.error(chalk.bgGray('rawRequest'), JSON.stringify(rawRequest, null, 4));
        }
        const rawResponse = await this.anthropicclaude.completions.create(rawRequest);
        if (this.options.isVerbose) {
            console.error(chalk.bgGray('rawResponse'), JSON.stringify(rawResponse, null, 4));
        }

        if (!rawResponse.choices[0]) {
            throw new Error('No choises from AnthropicClaude');
        }

        if (rawResponse.choices.length > 1) {
            // TODO: This should be maybe only warning
            throw new Error('More than one choise from AnthropicClaude');
        }

        const resultContent = rawResponse.choices[0].text;
        // eslint-disable-next-line prefer-const
        complete = getCurrentIsoDate();
        const usage = computeAnthropicClaudeUsage(rawResponse);

        if (!resultContent) {
            throw new Error('No response message from AnthropicClaude');
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
}

/**

 * TODO: Maybe Create some common util for gptChat and gptComplete
 * TODO: Maybe make custom AnthropicClaudeError
 */
