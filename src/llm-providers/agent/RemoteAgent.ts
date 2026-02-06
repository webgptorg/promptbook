import { BehaviorSubject } from 'rxjs';
import spaceTrim from 'spacetrim';
import type { AgentCapability } from '../../book-2.0/agent-source/AgentBasicInformation';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import type { ChatPromptResult } from '../../execution/PromptResult';
import { book } from '../../pipeline/book-notation';
import type { ChatPrompt, Prompt } from '../../types/Prompt';
import type {
    string_agent_hash,
    string_agent_name,
    string_agent_url,
    string_color,
    string_date_iso8601,
    string_fonts,
    string_url_image,
} from '../../types/typeAliases';
import { isAssistantPreparationToolCall } from '../../types/ToolCall';
import type { TODO_any } from '../../utils/organization/TODO_any';
import { Agent } from './Agent';
import type { AgentOptions } from './AgentOptions';
import type { RemoteAgentOptions } from './RemoteAgentOptions';

/**
 * Payload returned by remote agent profile endpoint.
 */
type RemoteAgentProfile = {
    agentName: string_agent_name;
    agentHash?: string_agent_hash;
    personaDescription?: string | null;
    initialMessage?: string | null;
    links?: string[];
    meta?: {
        fullname?: string;
        image?: string_url_image;
        link?: string;
        font?: string_fonts;
        color?: string_color;
        title?: string;
        description?: string;
        [key: string]: string | undefined;
    };
    capabilities?: AgentCapability[];
    samples?: Array<{ question: string | null; answer: string }>;
    toolTitles?: Record<string, string>;
    isVoiceCallingEnabled?: boolean;
    knowledgeSources?: Array<{ url: string; filename: string }>;
};

/**
 * Resolve a remote META IMAGE value into an absolute URL when possible.
 */
function resolveRemoteImageUrl(
    imageUrl: string_url_image | undefined,
    agentUrl: string_agent_url,
): string_url_image | undefined {
    if (!imageUrl) {
        return undefined;
    }

    if (
        imageUrl.startsWith('http://') ||
        imageUrl.startsWith('https://') ||
        imageUrl.startsWith('data:') ||
        imageUrl.startsWith('blob:')
    ) {
        return imageUrl;
    }

    try {
        return new URL(imageUrl, agentUrl).href as string_url_image;
    } catch {
        return imageUrl;
    }
}

/**
 * Format a META commitment line when the value is provided.
 */
function formatMetaLine(label: string, value?: string): string | null {
    if (!value) {
        return null;
    }

    return `META ${label} ${value}`;
}

/**
 * Build a minimal agent source snapshot for remote agents.
 */
function buildRemoteAgentSource(profile: RemoteAgentProfile, meta: RemoteAgentProfile['meta']): string_book {
    const metaLines = [
        formatMetaLine('FULLNAME', meta?.fullname),
        formatMetaLine('IMAGE', meta?.image),
        formatMetaLine('DESCRIPTION', meta?.description),
        formatMetaLine('COLOR', meta?.color),
        formatMetaLine('FONT', meta?.font),
        formatMetaLine('LINK', meta?.link),
    ]
        .filter((line): line is string => Boolean(line))
        .join('\n');
    const personaBlock = profile.personaDescription
        ? spaceTrim(
              (block) => `
            PERSONA
            ${block(profile.personaDescription || '')}
        `,
          )
        : '';

    return book`
        ${profile.agentName}

        ${metaLines}

        ${personaBlock}
    `;
}

/**
 * Represents one AI Agent
 *
 * Note: [🦖] There are several different things in Promptbook:
 * - `Agent` - which represents an AI Agent with its source, memories, actions, etc. Agent is a higher-level abstraction which is internally using:
 * - `LlmExecutionTools` - which wraps one or more LLM models and provides an interface to execute them
 * - `AgentLlmExecutionTools` - which is a specific implementation of `LlmExecutionTools` that wraps another LlmExecutionTools and applies agent-specific system prompts and requirements
 * - `OpenAiAssistantExecutionTools` - (Deprecated) which is a specific implementation of `LlmExecutionTools` for OpenAI models with assistant capabilities
 * - `OpenAiAgentKitExecutionTools` - which is a specific implementation of `LlmExecutionTools` backed by OpenAI AgentKit
 * - `RemoteAgent` - which is an `Agent` that connects to a Promptbook Agents Server
 *
 * @public exported from `@promptbook/core`
 */
export class RemoteAgent extends Agent {
    public static async connect(options: RemoteAgentOptions) {
        const agentProfileUrl = `${options.agentUrl}/api/profile`;
        const profileResponse = await fetch(agentProfileUrl);
        // <- TODO: [🐱‍🚀] What about closed-source agents?
        // <- TODO: [🐱‍🚀] Maybe use promptbookFetch

        if (!profileResponse.ok) {
            throw new Error(
                spaceTrim(
                    (block) => `
                        Failed to fetch remote agent profile:

                        Agent URL:
                        ${options.agentUrl}

                        Agent Profile URL:
                        ${agentProfileUrl}
                        
                        Http Error:
                        ${block(profileResponse.statusText)}
                
                `,
                ),
            );
        }

        const profile = (await profileResponse.json()) as RemoteAgentProfile;
        const resolvedMeta = {
            ...(profile.meta || {}),
            image: resolveRemoteImageUrl(profile.meta?.image, options.agentUrl),
        };

        // Note: We are creating dummy agent source because we don't have the source from the remote agent
        //       But we populate the metadata from the profile
        const agentSource: BehaviorSubject<string_book> = new BehaviorSubject<string_book>(
            buildRemoteAgentSource(profile, resolvedMeta),
        );
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
            teacherAgent: null, // <- Note:
        });

        remoteAgent._remoteAgentName = profile.agentName;
        remoteAgent._remoteAgentHash = profile.agentHash;
        remoteAgent.personaDescription = profile.personaDescription ?? null;
        remoteAgent.initialMessage = profile.initialMessage ?? null;
        remoteAgent.links = profile.links || [];
        remoteAgent.meta = resolvedMeta;
        remoteAgent.capabilities = profile.capabilities || [];
        remoteAgent.samples = profile.samples || [];
        remoteAgent.toolTitles = profile.toolTitles || {};
        remoteAgent._isVoiceCallingEnabled = profile.isVoiceCallingEnabled === true; // [✨✷] Store voice calling status
        remoteAgent.knowledgeSources = profile.knowledgeSources || [];

        return remoteAgent;
    }

    /**
     * The source of the agent
     */
    private agentUrl: string_agent_url;
    private _remoteAgentName: string_agent_name | undefined;
    private _remoteAgentHash: string_agent_hash | undefined;
    public toolTitles: Record<string, string> = {};
    private _isVoiceCallingEnabled: boolean = false; // [✨✷] Track voice calling status
    public knowledgeSources: Array<{ url: string; filename: string }> = [];

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
        const toolCalls: Array<NonNullable<ChatPromptResult['toolCalls']>[number]> = [];
        const preparationToolCalls: Array<NonNullable<ChatPromptResult['toolCalls']>[number]> = [];
        let hasReceivedModelOutput = false;

        const normalizeToolCall = (
            toolCall: NonNullable<ChatPromptResult['toolCalls']>[number],
        ): NonNullable<ChatPromptResult['toolCalls']>[number] => {
            if (toolCall.createdAt) {
                return toolCall;
            }

            return {
                ...toolCall,
                createdAt: new Date().toISOString() as string_date_iso8601, // <- TODO: !!!! Make util $getCurrentIsoTimestamp()
            };
        };

        const getToolCallKey = (toolCall: NonNullable<ChatPromptResult['toolCalls']>[number]): string => {
            const rawId = (toolCall.rawToolCall as TODO_any)?.id;
            if (rawId) {
                return `id:${rawId}`;
            }

            const argsKey = (() => {
                if (typeof toolCall.arguments === 'string') {
                    return toolCall.arguments;
                }

                if (!toolCall.arguments) {
                    return '';
                }

                try {
                    return JSON.stringify(toolCall.arguments);
                } catch {
                    return '';
                }
            })();

            return `${toolCall.name}:${toolCall.createdAt || ''}:${argsKey}`;
        };

        const mergeToolCall = (
            existing: NonNullable<ChatPromptResult['toolCalls']>[number],
            incoming: NonNullable<ChatPromptResult['toolCalls']>[number],
        ): NonNullable<ChatPromptResult['toolCalls']>[number] => {
            const incomingResult = incoming.result;
            const shouldKeepExistingResult =
                incomingResult === '' && existing.result !== undefined && existing.result !== '';

            return {
                ...existing,
                ...incoming,
                result: shouldKeepExistingResult ? existing.result : incomingResult ?? existing.result,
                createdAt: existing.createdAt || incoming.createdAt,
                errors: incoming.errors ? [...(existing.errors || []), ...incoming.errors] : existing.errors,
                warnings: incoming.warnings ? [...(existing.warnings || []), ...incoming.warnings] : existing.warnings,
            };
        };

        const upsertToolCalls = (
            incomingToolCalls: ReadonlyArray<NonNullable<ChatPromptResult['toolCalls']>[number]>,
        ) => {
            for (const toolCall of incomingToolCalls) {
                const normalized = normalizeToolCall(toolCall);
                if (isAssistantPreparationToolCall(normalized)) {
                    if (hasReceivedModelOutput) {
                        continue;
                    }
                    preparationToolCalls.length = 0;
                    preparationToolCalls.push(normalized);
                    continue;
                }
                if (preparationToolCalls.length > 0) {
                    preparationToolCalls.length = 0;
                }
                const key = getToolCallKey(normalized);
                const existingIndex = toolCalls.findIndex((existing) => getToolCallKey(existing) === key);

                if (existingIndex === -1) {
                    toolCalls.push(normalized);
                } else {
                    toolCalls[existingIndex] = mergeToolCall(toolCalls[existingIndex]!, normalized);
                }
            }
        };

        /**
         * Builds the tool call list including any preparation marker still active.
         */
        const getActiveToolCalls = () =>
            preparationToolCalls.length > 0 ? [...preparationToolCalls, ...toolCalls] : toolCalls;

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

                        let sawToolCalls = false;
                        let hasNonEmptyText = false;
                        const textLines: string[] = [];
                        const lines = textChunk.split(/\r?\n/);
                        for (const line of lines) {
                            const trimmedLine = line.trim();
                            let isToolCallLine = false;
                            if (trimmedLine.startsWith('{') && trimmedLine.endsWith('}')) {
                                try {
                                    const chunk = JSON.parse(trimmedLine);
                                    if (chunk.toolCalls) {
                                        const normalizedToolCalls = chunk.toolCalls.map(normalizeToolCall);
                                        upsertToolCalls(normalizedToolCalls);
                                        onProgress({
                                            content,
                                            modelName: this.modelName,
                                            timing: {} as TODO_any,
                                            usage: {} as TODO_any,
                                            rawPromptContent: {} as TODO_any,
                                            rawRequest: {} as TODO_any,
                                            rawResponse: {} as TODO_any,
                                            toolCalls: getActiveToolCalls(),
                                        });
                                        sawToolCalls = true;
                                        isToolCallLine = true;
                                    }
                                } catch (error) {
                                    // Ignore non-json lines
                                }
                            }

                            if (!isToolCallLine) {
                                textLines.push(line);
                                if (line.length > 0) {
                                    hasNonEmptyText = true;
                                }
                            }
                        }

                        if (sawToolCalls) {
                            if (!hasNonEmptyText) {
                                continue;
                            }

                            const textChunkWithoutToolCalls = textLines.join('\n');
                            content += textChunkWithoutToolCalls;
                        } else {
                            // console.debug('RemoteAgent chunk:', textChunk);
                            content += textChunk;
                        }

                        if (!hasReceivedModelOutput && content.trim().length > 0) {
                            hasReceivedModelOutput = true;
                            preparationToolCalls.length = 0;
                        }

                        onProgress({
                            content,
                            modelName: this.modelName,
                            timing: {} as TODO_any,
                            usage: {} as TODO_any,
                            rawPromptContent: {} as TODO_any,
                            rawRequest: {} as TODO_any,
                            rawResponse: {} as TODO_any,
                            toolCalls: getActiveToolCalls(),
                        });
                    }
                }
                // Flush any remaining decoder internal state
                const lastChunk = decoder.decode();
                if (lastChunk) {
                    content += lastChunk;
                    if (!hasReceivedModelOutput && content.trim().length > 0) {
                        hasReceivedModelOutput = true;
                        preparationToolCalls.length = 0;
                    }
                    onProgress({
                        content: lastChunk,
                        modelName: this.modelName,
                        timing: {} as TODO_any,
                        usage: {} as TODO_any,
                        rawPromptContent: {} as TODO_any,
                        rawRequest: {} as TODO_any,
                        rawResponse: {} as TODO_any,
                        toolCalls: getActiveToolCalls(),
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
            toolCalls,
            // <- TODO: [🐱‍🚀] Transfer and proxy the metadata
        };

        return agentResult;
    }
}

/**
 * TODO: [🧠][😰]Agent is not working with the parameters, should it be?
 * TODO: !!! Agent on remote server
 */
