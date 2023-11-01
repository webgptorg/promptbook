import chalk from 'chalk';
import OpenAI from 'openai';
import { Promisable } from 'type-fest';
import { Prompt } from '../../../../types/Prompt';
import { TaskProgress } from '../../../../types/TaskProgress';
import { NaturalExecutionTools } from '../../../NaturalExecutionTools';
import { PromptChatResult, PromptCompletionResult } from '../../../PromptResult';
import { OpenAiExecutionToolsOptions } from './OpenAiExecutionToolsOptions';

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
    public async gptChat(
        prompt: Prompt,
        onProgress: (taskProgress: TaskProgress) => Promisable<void>,
    ): Promise<PromptChatResult> {
        if (this.options.isVerbose) {
            console.info('💬 OpenAI gptChat call');
        }

        const { content, modelRequirements } = prompt;

        // TODO: [☂] Use here more modelRequirements
        if (modelRequirements.variant !== 'CHAT') {
            throw new Error('Use gptChat only for CHAT variant');
        }

        const model = 'gpt-3.5-turbo'; /* <- TODO: [☂] Use here more modelRequirements */
        const modelSettings = { model };
        const rawRequest: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming = {
            ...modelSettings,
            messages: [
                {
                    role: 'user',
                    content,
                },
            ],
            stream: true,
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
    public async gptComplete(
        prompt: Prompt,
        onProgress?: (taskProgress: TaskProgress) => Promisable<void>,
    ): Promise<PromptCompletionResult> {
        if (this.options.isVerbose) {
            console.info('🖋 OpenAI gptComplete call');
        }

        const { content, modelRequirements } = prompt;

        if (onProgress) {
            onProgress({
                name: 'progress',
                title: 'OpenAI gptComplete call !!!!',
                isDone: false,
            });
        }

        // TODO: [☂] Use here more modelRequirements
        if (modelRequirements.variant !== 'COMPLETION') {
            throw new Error('Use gptComplete only for COMPLETION variant');
        }

        const model = 'gpt-3.5-turbo-instruct'; /* <- TODO: [☂] Use here more modelRequirements */
        const modelSettings = {
            model,
            max_tokens: 2000 /* <- TODO: [☂] Use here more modelRequirements */,
        };

        const rawRequest: OpenAI.Completions.CompletionCreateParamsNonStreaming = {
            ...modelSettings,
            prompt: content,
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
 * TODO: Maybe Create some common util for gptChat and gptComplete
 * TODO: Maybe make custom OpenaiError
 */
