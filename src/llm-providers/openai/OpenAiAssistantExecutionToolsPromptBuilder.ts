import type OpenAI from 'openai';
import type { Prompt } from '../../types/Prompt';
import { templateParameters } from '../../utils/parameters/templateParameters';
import { uploadFilesToOpenAi } from './utils/uploadFilesToOpenAi';

/**
 * Builds assistant prompt content and thread messages.
 *
 * @private helper of `OpenAiAssistantExecutionTools`
 */
export class OpenAiAssistantExecutionToolsPromptBuilder {
    /**
     * Resolves the raw user-visible prompt content sent to the assistant.
     */
    public createAssistantRawPromptContent(prompt: Prompt): string {
        return templateParameters(prompt.content, {
            ...prompt.parameters,
            modelName: 'assistant',
            //          <- [🧠] What is the best value here
        });
    }

    /**
     * Builds the thread history plus the current user message for one assistant call.
     */
    public async createAssistantThreadMessages(options: {
        readonly client: OpenAI;
        readonly prompt: Prompt;
        readonly rawPromptContent: string;
    }): Promise<Array<OpenAI.Beta.ThreadCreateAndRunParams.Thread.Message>> {
        return [
            ...this.createAssistantThreadHistoryMessages(options.prompt),
            await this.createAssistantCurrentUserMessage(options),
        ];
    }

    /**
     * Converts the existing prompt thread into OpenAI assistant thread messages.
     */
    private createAssistantThreadHistoryMessages(
        prompt: Prompt,
    ): Array<OpenAI.Beta.ThreadCreateAndRunParams.Thread.Message> {
        if (!('thread' in prompt) || !Array.isArray(prompt.thread)) {
            return [];
        }

        // TODO: [🈹] Maybe this should not be here but in other place, look at commit 39d705e75e5bcf7a818c3af36bc13e1c8475c30c
        return prompt.thread.map((message) => ({
            role: message.sender === 'assistant' ? 'assistant' : 'user',
            content: message.content,
        }));
    }

    /**
     * Creates the current user message, including uploaded file attachments when present.
     */
    private async createAssistantCurrentUserMessage(options: {
        readonly client: OpenAI;
        readonly prompt: Prompt;
        readonly rawPromptContent: string;
    }): Promise<OpenAI.Beta.ThreadCreateAndRunParams.Thread.Message> {
        const currentUserMessage: OpenAI.Beta.ThreadCreateAndRunParams.Thread.Message = {
            role: 'user',
            content: options.rawPromptContent,
        };

        if ('files' in options.prompt && Array.isArray(options.prompt.files) && options.prompt.files.length > 0) {
            const fileIds = await uploadFilesToOpenAi(options.client, options.prompt.files);
            currentUserMessage.attachments = fileIds.map((fileId) => ({
                file_id: fileId,
                tools: [{ type: 'file_search' }, { type: 'code_interpreter' }],
            }));
        }

        return currentUserMessage;
    }
}
