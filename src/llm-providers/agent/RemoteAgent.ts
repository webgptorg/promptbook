import { BehaviorSubject } from 'rxjs';
import spaceTrim from 'spacetrim';
import type { AgentCapability } from '../../book-2.0/agent-source/AgentBasicInformation';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import { CHAT_STREAM_KEEP_ALIVE_TOKEN, CHAT_STREAM_METADATA_PREFIX } from '../../constants/streaming';
import type { CallChatModelStreamOptions } from '../../execution/LlmExecutionTools';
import type { ChatPromptResult } from '../../execution/PromptResult';
import { book } from '../../pipeline/book-notation';
import type { ChatPrompt, Prompt } from '../../types/Prompt';
import { isAssistantPreparationToolCall } from '../../types/ToolCall';
import type {
    string_agent_hash,
    string_agent_name,
    string_agent_url,
    string_color,
    string_date_iso8601,
    string_fonts,
    string_url_image,
} from '../../types/typeAliases';
import { decodeChatStreamWhitespaceFromTransport } from '../../utils/chat/decodeChatStreamWhitespaceFromTransport';
import { attachClientVersionHeader } from '../../utils/clientVersion';
import type { TODO_any } from '../../utils/organization/TODO_any';
import { getToolCallIdentity } from '../../utils/toolCalls/getToolCallIdentity';
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
    isVoiceTtsSttEnabled?: boolean;
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
        const profileResponse = await fetch(agentProfileUrl, {
            headers: attachClientVersionHeader(),
        });
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
        remoteAgent._isVoiceTtsSttEnabled = profile.isVoiceTtsSttEnabled !== false;
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
    private _isVoiceTtsSttEnabled: boolean = true;

    /**
     * Indicates whether the remote server allows text-to-speech and speech-to-text.
     *
     * @public exported from `@promptbook/core`
     */
    public get isVoiceTtsSttEnabled(): boolean {
        return this._isVoiceTtsSttEnabled;
    }
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
        if (!this._isVoiceCallingEnabled || !this._isVoiceTtsSttEnabled) {
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
                headers: attachClientVersionHeader(),
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
        options?: CallChatModelStreamOptions,
    ): Promise<ChatPromptResult> {
        // Ensure we're working with a chat prompt
        if (prompt.modelRequirements.modelVariant !== 'CHAT') {
            throw new Error('Agents only supports chat prompts');
        }

        const chatPrompt = prompt as ChatPrompt;

        const bookResponse = await fetch(`${this.agentUrl}/api/chat`, {
            method: 'POST',
            headers: attachClientVersionHeader({
                'Content-Type': 'application/json',
            }),
            body: JSON.stringify({
                message: prompt.content,
                thread: chatPrompt.thread,
                attachments: chatPrompt.attachments,
                parameters: chatPrompt.parameters,
            }),
            signal: options?.signal,
        });
        // <- TODO: [🐱‍🚀] What about closed-source agents?
        // <- TODO: [🐱‍🚀] Maybe use promptbookFetch

        let content = '';
        const toolCalls: Array<NonNullable<ChatPromptResult['toolCalls']>[number]> = [];
        const preparationToolCalls: Array<NonNullable<ChatPromptResult['toolCalls']>[number]> = [];
        let hasReceivedModelOutput = false;
        let pendingToolCallLineFragment = '';

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
            return getToolCallIdentity(toolCall);
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

        /**
         * Emits one progress snapshot using current aggregated text and tool calls.
         */
        const emitProgress = () => {
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
        };

        /**
         * Attempts to parse one completed NDJSON tool-call line.
         */
        const tryParseToolCallLine = (trimmedLine: string): boolean => {
            const toolCalls = extractMetadataToolCalls(trimmedLine);
            if (!toolCalls) {
                return false;
            }

            const normalizedToolCalls = toolCalls.map(normalizeToolCall);
            upsertToolCalls(normalizedToolCalls);
            emitProgress();
            return true;
        };

        const extractMetadataToolCalls = (
            trimmedLine: string,
        ): ReadonlyArray<NonNullable<ChatPromptResult['toolCalls']>[number]> | null => {
            const normalizedLine = trimmedLine.startsWith(CHAT_STREAM_METADATA_PREFIX)
                ? trimmedLine.slice(CHAT_STREAM_METADATA_PREFIX.length).trim()
                : trimmedLine;

            if (!normalizedLine.startsWith('{') || !normalizedLine.endsWith('}')) {
                return null;
            }

            try {
                const chunk = JSON.parse(normalizedLine);
                if (chunk?.kind === 'toolCalls' && Array.isArray(chunk.toolCalls)) {
                    return chunk.toolCalls;
                }
                if (Array.isArray(chunk.toolCalls)) {
                    return chunk.toolCalls;
                }
            } catch {
                return null;
            }

            return null;
        };

        /**
         * Detects whether an incomplete trailing line might be a split tool-call payload.
         */
        const isPotentialToolCallLineFragment = (trimmedLine: string): boolean => {
            if (trimmedLine.length === 0) {
                return false;
            }

        const metadataLinePrefix = `${CHAT_STREAM_METADATA_PREFIX}{`;
        const legacyToolCallPrefix = '{"toolCalls":';
        return (
            metadataLinePrefix.startsWith(trimmedLine) ||
            trimmedLine.startsWith(metadataLinePrefix) ||
            legacyToolCallPrefix.startsWith(trimmedLine) ||
            trimmedLine.startsWith(legacyToolCallPrefix)
        );
    };

        /**
         * Appends model text to accumulated content and emits progress.
         */
        const appendTextChunk = (textChunk: string) => {
            if (!textChunk) {
                return;
            }

            const decodedChunk = decodeChatStreamWhitespaceFromTransport(textChunk);
            content += decodedChunk;

            if (!hasReceivedModelOutput && content.trim().length > 0) {
                hasReceivedModelOutput = true;
                preparationToolCalls.length = 0;
            }

            emitProgress();
        };

        /**
         * Consumes one decoded transport chunk, removing keep-alive pings and tool-call frames.
         *
         * Note: Tool-call JSON is line-delimited but may arrive split across transport chunks.
         */
        const processDecodedChunk = (decodedChunk: string) => {
            if (!decodedChunk) {
                return;
            }

            const combinedChunk = pendingToolCallLineFragment + decodedChunk;
            pendingToolCallLineFragment = '';

            const hasTrailingNewline = combinedChunk.endsWith('\n') || combinedChunk.endsWith('\r');
            const lines = combinedChunk.split(/\r?\n/);
            const trailingFragment = hasTrailingNewline ? '' : lines.pop() ?? '';

            let hasNonEmptyText = false;
            const textLines: Array<string> = [];

            for (const line of lines) {
                const trimmedLine = line.trim();
                if (trimmedLine === CHAT_STREAM_KEEP_ALIVE_TOKEN) {
                    continue;
                }

                if (tryParseToolCallLine(trimmedLine)) {
                    continue;
                }

                textLines.push(line);
                if (trimmedLine.length > 0) {
                    hasNonEmptyText = true;
                }
            }

            if (trailingFragment !== '') {
                const trimmedTrailingFragment = trailingFragment.trim();
                if (isPotentialToolCallLineFragment(trimmedTrailingFragment)) {
                    pendingToolCallLineFragment = trailingFragment;
                } else {
                    textLines.push(trailingFragment);
                    if (trimmedTrailingFragment.length > 0) {
                        hasNonEmptyText = true;
                    }
                }
            }

            if (!hasNonEmptyText) {
                return;
            }

            appendTextChunk(textLines.join('\n'));
        };

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
                        processDecodedChunk(textChunk);
                    }
                }
                // Flush any remaining decoder internal state
                const lastChunk = decoder.decode();
                if (lastChunk) {
                    processDecodedChunk(lastChunk);
                }

                if (pendingToolCallLineFragment) {
                    const trimmedPending = pendingToolCallLineFragment.trim();
                    if (trimmedPending === CHAT_STREAM_KEEP_ALIVE_TOKEN) {
                        pendingToolCallLineFragment = '';
                    } else if (tryParseToolCallLine(trimmedPending)) {
                        pendingToolCallLineFragment = '';
                    } else {
                        appendTextChunk(pendingToolCallLineFragment);
                        pendingToolCallLineFragment = '';
                    }
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
