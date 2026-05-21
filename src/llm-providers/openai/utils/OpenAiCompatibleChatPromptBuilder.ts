import type OpenAI from 'openai';
import type { ChatModelRequirements } from '../../../types/ModelRequirements';
import type { ChatPrompt, Prompt } from '../../../types/Prompt';
import type { string_model_name } from '../../../types/string_model_name';
import type { TODO_any } from '../../../utils/organization/TODO_any';
import type { chococake } from '../../../utils/organization/really_any';
import { mapToolsToOpenAi } from './mapToolsToOpenAi';

/**
 * Type describing structured clone function.
 */
type StructuredCloneFunction = <T>(value: T) => T;

/**
 * Builds cloned prompt payloads, OpenAI messages, and raw chat requests.
 *
 * @private helper of `callOpenAiCompatibleChatModel`
 */
export class OpenAiCompatibleChatPromptBuilder {
    /**
     * Creates a deep copy of the prompt while keeping attached files intact when structured clone is not available.
     */
    public clonePromptPreservingFiles(prompt: Prompt): Prompt {
        const structuredCloneFn = this.getStructuredCloneFunction();

        if (typeof structuredCloneFn === 'function') {
            return structuredCloneFn(prompt);
        }

        const clonedPrompt: Prompt = JSON.parse(JSON.stringify(prompt));

        if (this.hasChatPromptFiles(prompt)) {
            (clonedPrompt as ChatPrompt).files = prompt.files;
        }

        return clonedPrompt;
    }

    /**
     * Resolves OpenAI chat creation settings from model requirements and prompt format.
     */
    public createModelSettings(options: {
        readonly currentModelRequirements: ChatModelRequirements;
        readonly format?: Prompt['format'];
        readonly modelName: string_model_name;
    }): OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming {
        const modelSettings: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
            model: options.modelName,
            max_tokens: options.currentModelRequirements.maxTokens,
            temperature: options.currentModelRequirements.temperature,
        } as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;

        if (options.currentModelRequirements.responseFormat !== undefined) {
            modelSettings.response_format = options.currentModelRequirements.responseFormat;
        } else if (options.format === 'JSON') {
            modelSettings.response_format = {
                type: 'json_object',
            };
        }

        return modelSettings;
    }

    /**
     * Creates the full OpenAI chat message list, including system, thread, and user content.
     */
    public async createMessages(options: {
        readonly prompt: Prompt;
        readonly currentModelRequirements: ChatModelRequirements;
        readonly rawPromptContent: string;
    }): Promise<Array<OpenAI.Chat.Completions.ChatCompletionMessageParam>> {
        return [
            ...(options.currentModelRequirements.systemMessage === undefined
                ? []
                : ([
                      {
                          role: 'system',
                          content: options.currentModelRequirements.systemMessage,
                      },
                  ] as const)),
            ...this.createThreadMessages(options.prompt),
            await this.createPromptUserMessage({
                prompt: options.prompt,
                rawPromptContent: options.rawPromptContent,
            }),
        ];
    }

    /**
     * Creates one raw OpenAI chat request from the current conversation state.
     */
    public createRawRequest(options: {
        readonly modelSettings: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;
        readonly messages: Array<OpenAI.Chat.Completions.ChatCompletionMessageParam>;
        readonly tools: ReadonlyArray<TODO_any> | undefined;
        readonly userId: string | number | undefined;
    }): OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming {
        return {
            ...options.modelSettings,
            messages: options.messages,
            user: options.userId?.toString(),
            tools: options.tools === undefined ? undefined : (mapToolsToOpenAi(options.tools) as TODO_any),
        };
    }

    /**
     * Provides access to the structured clone implementation when available.
     */
    private getStructuredCloneFunction(): StructuredCloneFunction | undefined {
        return (globalThis as typeof globalThis & { structuredClone?: StructuredCloneFunction }).structuredClone;
    }

    /**
     * Checks whether the prompt is a chat prompt that carries file attachments.
     */
    private hasChatPromptFiles(prompt: Prompt): prompt is ChatPrompt & { files: Array<File> } {
        return 'files' in prompt && Array.isArray((prompt as ChatPrompt).files);
    }

    /**
     * Converts the existing prompt thread into OpenAI chat messages.
     */
    private createThreadMessages(prompt: Prompt): Array<OpenAI.Chat.Completions.ChatCompletionMessageParam> {
        if (!('thread' in prompt) || !Array.isArray((prompt as TODO_any).thread)) {
            return [];
        }

        return (prompt as chococake).thread!.map(
            (message: chococake): OpenAI.Chat.Completions.ChatCompletionMessageParam => ({
                role: message.sender === 'assistant' ? 'assistant' : 'user',
                content: message.content,
            }),
        );
    }

    /**
     * Builds the final user message, including inline image attachments when present.
     */
    private async createPromptUserMessage(options: {
        readonly prompt: Prompt;
        readonly rawPromptContent: string;
    }): Promise<OpenAI.Chat.Completions.ChatCompletionUserMessageParam> {
        if (!('files' in options.prompt) || !Array.isArray(options.prompt.files) || options.prompt.files.length === 0) {
            return {
                role: 'user',
                content: options.rawPromptContent,
            };
        }

        const filesContent = await Promise.all(
            options.prompt.files.map(async (file: File) => {
                const arrayBuffer = await file.arrayBuffer();
                const base64 = Buffer.from(arrayBuffer).toString('base64');
                return {
                    type: 'image_url',
                    image_url: {
                        url: `data:${file.type};base64,${base64}`,
                    },
                } as const;
            }),
        );

        return {
            role: 'user',
            content: [
                {
                    type: 'text',
                    text: options.rawPromptContent,
                },
                ...filesContent,
            ],
        } as OpenAI.Chat.Completions.ChatCompletionUserMessageParam;
    }
}
