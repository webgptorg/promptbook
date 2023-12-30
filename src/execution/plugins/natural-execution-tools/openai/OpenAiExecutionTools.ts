import chalk from 'chalk';
import OpenAI from 'openai';
import type { Prompt } from '../../../../types/Prompt';
import type { NaturalExecutionTools } from '../../../NaturalExecutionTools';
import type { PromptChatResult, PromptCompletionResult } from '../../../PromptResult';
import type { OpenAiExecutionToolsOptions } from './OpenAiExecutionToolsOptions';

/**
 * Execution Tools for calling OpenAI API.
 */
export class OpenAiExecutionTools implements NaturalExecutionTools {
    /**
     * OpenAI API client.
     */
    private readonly openai: OpenAI;

    public constructor(private readonly options: OpenAiExecutionToolsOptions) {
        this.openai = new OpenAI({
            apiKey: this.options.openAiApiKey,
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
            throw new Error('Use gptChat only for CHAT variant');
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

        if (this.options.isVerbose) {
            console.error(chalk.bgGray('rawRequest'), JSON.stringify(rawRequest, null, 4));
        }
        const rawResponse = await this.openai.chat.completions.create(rawRequest);
        if (this.options.isVerbose) {
            console.error(chalk.bgGray('rawResponse'), JSON.stringify(rawResponse, null, 4));
        }

        if (!rawResponse.choices[0]) {
            throw new Error('No choises from OpenAPI');
        }

        if (rawResponse.choices.length > 1) {
            // TODO: This should be maybe only warning
            throw new Error('More than one choise from OpenAPI');
        }

        const resultContent = rawResponse.choices[0].message.content;

        if (!resultContent) {
            throw new Error('No response message from OpenAPI');
        }

        return {
            content: resultContent,
            model,
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
            throw new Error('Use gptComplete only for COMPLETION variant');
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

        if (this.options.isVerbose) {
            console.error(chalk.bgGray('rawRequest'), JSON.stringify(rawRequest, null, 4));
        }
        const rawResponse = await this.openai.completions.create(rawRequest);
        if (this.options.isVerbose) {
            console.error(chalk.bgGray('rawResponse'), JSON.stringify(rawResponse, null, 4));
        }

        if (!rawResponse.choices[0]) {
            throw new Error('No choises from OpenAPI');
        }

        if (rawResponse.choices.length > 1) {
            // TODO: This should be maybe only warning
            throw new Error('More than one choise from OpenAPI');
        }

        const resultContent = rawResponse.choices[0].text;

        if (!resultContent) {
            throw new Error('No response message from OpenAPI');
        }

        return {
            content: resultContent,
            model,
            rawResponse,
            // <- [🤹‍♂️]
        };
    }
}

/**
 * TODO: !!!! Allow to use other models - List all from openai
 * TODO: Maybe Create some common util for gptChat and gptComplete
 * TODO: Maybe make custom OpenaiError
 */
