import { BehaviorSubject } from 'rxjs';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import type { ChatPromptResult } from '../../execution/PromptResult';
import { book } from '../../pipeline/book-notation';
import type { ChatPrompt, Prompt } from '../../types/Prompt';
import type { string_agent_hash, string_agent_name, string_agent_url } from '../../types/typeAliases';
import type { TODO_any } from '../../utils/organization/TODO_any';
import { Agent } from './Agent';
import type { AgentOptions } from './AgentOptions';
import type { RemoteAgentOptions } from './RemoteAgentOptions';

/**
 * Represents one AI Agent
 *
 * Note: [🦖] There are several different things in Promptbook:
 * - `Agent` - which represents an AI Agent with its source, memories, actions, etc. Agent is a higher-level abstraction which is internally using:
 * - `LlmExecutionTools` - which wraps one or more LLM models and provides an interface to execute them
 * - `AgentLlmExecutionTools` - which is a specific implementation of `LlmExecutionTools` that wraps another LlmExecutionTools and applies agent-specific system prompts and requirements
 * - `OpenAiAssistantExecutionTools` - which is a specific implementation of `LlmExecutionTools` for OpenAI models with assistant capabilities, recommended for usage in `Agent` or `AgentLlmExecutionTools`
 * - `RemoteAgent` - which is an `Agent` that connects to a Promptbook Agents Server
 *
 * @public exported from `@promptbook/core`
 */
export class RemoteAgent extends Agent {
    public static async connect(options: RemoteAgentOptions) {
        console.log('[🐱‍🚀]', `${options.agentUrl}/api/profile`);
        const profileResponse = await fetch(`${options.agentUrl}/api/profile`);
        // <- TODO: [🐱‍🚀] What about closed-source agents?
        // <- TODO: [🐱‍🚀] Maybe use promptbookFetch

        const profile = await profileResponse.json();

        // Note: We are creating dummy agent source because we don't have the source from the remote agent
        //       But we populate the metadata from the profile
        const agentSource: BehaviorSubject<string_book> = new BehaviorSubject<string_book>(book`
            ${profile.agentName}

            ${profile.personaDescription}
        `);
        // <- TODO: [🐱‍🚀] createBookFromProfile
        // <- TODO: [🐱‍🚀] Support updating and self-updating

        const remoteAgent = new RemoteAgent({
            ...options,
            executionTools: {
                /* Note: These tools are not used */
                // ---------------------------------------
                /*
                TODO: !!! Get rid of
                
                > You have not provided any `LlmExecutionTools`
                > This means that you won't be able to execute any prompts that require large language models like GPT-4 or Anthropic's Claude.
                > 
                > Technically, it's not an error, but it's probably not what you want because it does not make sense to use Promptbook without language models.

                */
            },
            agentSource,
        });

        remoteAgent._remoteAgentName = profile.agentName;
        remoteAgent._remoteAgentHash = profile.agentHash;
        remoteAgent.personaDescription = profile.personaDescription;
        remoteAgent.initialMessage = profile.initialMessage;
        remoteAgent.links = profile.links;
        remoteAgent.meta = profile.meta;
        remoteAgent._isVoiceCallingEnabled = profile.isVoiceCallingEnabled === true; // [✨✷] Store voice calling status

        return remoteAgent;
    }

    /**
     * The source of the agent
     */
    private agentUrl: string_agent_url;
    private _remoteAgentName: string_agent_name | undefined;
    private _remoteAgentHash: string_agent_hash | undefined;
    private _isVoiceCallingEnabled: boolean = false; // [✨✷] Track voice calling status

    private constructor(options: AgentOptions & RemoteAgentOptions) {
        super(options);
        this.agentUrl = options.agentUrl;
    }

    public override get agentName(): string_agent_name {
        return this._remoteAgentName || super.agentName;
    }

    public override get agentHash(): string_agent_hash {
        return this._remoteAgentHash || super.agentHash;
    }

    /**
     * Calls the agent on agents remote server
     */
    public async callChatModel(prompt: Prompt): Promise<ChatPromptResult> {
        return this.callChatModelStream(prompt, () => {});
    }

    /**
     * Calls the agent on agents remote server with voice
     * [✨✷] Only available when voice calling is enabled on the server
     * Returns undefined if voice calling is disabled
     */
    public get callVoiceChatModel():
        | ((
              audio: Blob,
              prompt: Prompt,
          ) => Promise<{ text: string; audio: Blob; userMessage?: string; agentMessage?: string }>)
        | undefined {
        if (!this._isVoiceCallingEnabled) {
            return undefined;
        }

        return async (audio: Blob, prompt: Prompt) => {
            // Ensure we're working with a chat prompt
            if (prompt.modelRequirements.modelVariant !== 'CHAT') {
                throw new Error('Agents only supports chat prompts');
            }

            const chatPrompt = prompt as ChatPrompt;

            const formData = new FormData();
            formData.append('audio', audio, 'voice.webm');
            formData.append('message', prompt.content);
            if (chatPrompt.thread) {
                formData.append('thread', JSON.stringify(chatPrompt.thread));
            }

            const response = await fetch(`${this.agentUrl}/api/voice`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Voice chat failed: ${response.statusText}`);
            }

            const result = await response.json();

            // Convert base64 audio back to Blob
            const binaryString = atob(result.audio);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const audioBlob = new Blob([bytes], { type: 'audio/mp3' });

            return {
                text: result.agentMessage || result.text,
                userMessage: result.userMessage,
                agentMessage: result.agentMessage || result.text,
                audio: audioBlob,
            };
        };
    }

    public async callChatModelStream(
        prompt: Prompt,
        onProgress: (chunk: ChatPromptResult) => void,
    ): Promise<ChatPromptResult> {
        // Ensure we're working with a chat prompt
        if (prompt.modelRequirements.modelVariant !== 'CHAT') {
            throw new Error('Agents only supports chat prompts');
        }

        const chatPrompt = prompt as ChatPrompt;

        const bookResponse = await fetch(`${this.agentUrl}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: prompt.content,
                thread: chatPrompt.thread,
                attachments: chatPrompt.attachments,
            }),
        });
        // <- TODO: [🐱‍🚀] What about closed-source agents?
        // <- TODO: [🐱‍🚀] Maybe use promptbookFetch

        let content = '';

        if (!bookResponse.body) {
            content = await bookResponse.text();
        } else {
            // Note: [🐚] Problem with streaming is not here but it is not implemented on server
            const decoder = new TextDecoder();
            // Web ReadableStream is not async-iterable in many runtimes; use a reader.
            const reader = bookResponse.body.getReader();
            try {
                let doneReading = false;
                while (!doneReading) {
                    const { done, value } = await reader.read();
                    doneReading = !!done;
                    if (value) {
                        const textChunk = decoder.decode(value, { stream: true });
                        // console.debug('RemoteAgent chunk:', textChunk);
                        content += textChunk;
                        onProgress({
                            content,
                            modelName: this.modelName,
                            timing: {} as TODO_any,
                            usage: {} as TODO_any,
                            rawPromptContent: {} as TODO_any,
                            rawRequest: {} as TODO_any,
                            rawResponse: {} as TODO_any,
                        });
                    }
                }
                // Flush any remaining decoder internal state
                const lastChunk = decoder.decode();
                if (lastChunk) {
                    content += lastChunk;
                    onProgress({
                        content: lastChunk,
                        modelName: this.modelName,
                        timing: {} as TODO_any,
                        usage: {} as TODO_any,
                        rawPromptContent: {} as TODO_any,
                        rawRequest: {} as TODO_any,
                        rawResponse: {} as TODO_any,
                    });
                }
            } finally {
                reader.releaseLock();
            }
        }

        // <- TODO: [🐱‍🚀] Transfer metadata

        const agentResult: ChatPromptResult = {
            content,
            modelName: this.modelName,
            timing: {} as TODO_any,
            usage: {} as TODO_any,
            rawPromptContent: {} as TODO_any,
            rawRequest: {} as TODO_any,
            rawResponse: {} as TODO_any,
            // <- TODO: [🐱‍🚀] Transfer and proxy the metadata
        };

        return agentResult;
    }
}

/**
 * TODO: [🧠][😰]Agent is not working with the parameters, should it be?
 * TODO: !!! Agent on remote server
 */
