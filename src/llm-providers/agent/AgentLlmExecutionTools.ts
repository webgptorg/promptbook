import { SHA256 as sha256 } from 'crypto-js';
import hexEncoder from 'crypto-js/enc-hex';
import type { Promisable } from 'type-fest';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { createAgentModelRequirements } from '../../book-2.0/agent-source/createAgentModelRequirements';
import { parseAgentSource } from '../../book-2.0/agent-source/parseAgentSource';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import type { ChatParticipant } from '../../book-components/Chat/types/ChatParticipant';
import type { AvailableModel } from '../../execution/AvailableModel';
import type { CallChatModelStreamOptions, LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { ChatPromptResult, CommonPromptResult } from '../../execution/PromptResult';
import { UNCERTAIN_USAGE } from '../../execution/utils/usage-constants';
import type { ChatPrompt, Prompt } from '../../types/Prompt';
import { ASSISTANT_PREPARATION_TOOL_CALL_NAME } from '../../types/ToolCall';
import type {
    string_markdown,
    string_markdown_text,
    string_model_name,
    string_prompt,
    string_title,
} from '../../types/typeAliases';
import { appendChatAttachmentContextWithContent, normalizeChatAttachments } from '../../utils/chat/chatAttachments';
import { humanizeAiText } from '../../utils/markdown/humanizeAiText';
import { promptbookifyAiText } from '../../utils/markdown/promptbookifyAiText';
import { $getCurrentDate } from '../../utils/misc/$getCurrentDate';
import { normalizeToKebabCase } from '../../utils/normalization/normalize-to-kebab-case';
import { keepUnused } from '../../utils/organization/keepUnused';
import { really_unknown } from '../../utils/organization/really_unknown';
import {
    OpenAiAgentKitExecutionTools,
    mapResponseFormatToAgentOutputType,
} from '../openai/OpenAiAgentKitExecutionTools';
import { OpenAiAssistantExecutionTools } from '../openai/OpenAiAssistantExecutionTools';
import type { CreateAgentLlmExecutionToolsOptions } from './CreateAgentLlmExecutionToolsOptions';

/**
 * Emits a progress update to signal assistant preparation before long setup work.
 */
function emitAssistantPreparationProgress(options: {
    /**
     * Callback to send progress updates to the caller.
     */
    readonly onProgress: (chunk: ChatPromptResult) => void;
    /**
     * Original prompt being executed.
     */
    readonly prompt: Prompt;
    /**
     * Model name used for the update payload.
     */
    readonly modelName: string_model_name;
    /**
     * Optional detail describing the current preparation phase.
     */
    readonly phase?: string;
}): void {
    const startedAt = $getCurrentDate();

    options.onProgress({
        content: '',
        modelName: options.modelName,
        timing: {
            start: startedAt,
            complete: startedAt,
        },
        usage: UNCERTAIN_USAGE,
        rawPromptContent: options.prompt.content as string_prompt,
        rawRequest: null,
        rawResponse: {
            status: 'assistant_preparation',
        },
        toolCalls: [
            {
                name: ASSISTANT_PREPARATION_TOOL_CALL_NAME,
                arguments: options.phase ? { phase: options.phase } : {},
                createdAt: startedAt,
            },
        ],
    });
}

/**
 * Merges the agent's predefined knowledge sources with user-provided attachment URLs.
 *
 * @private internal helper for `AgentLlmExecutionTools`
 */
function mergeKnowledgeSourcesWithAttachments(
    baseSources: ReadonlyArray<string> | undefined,
    attachmentUrls: ReadonlyArray<string>,
): Array<string> {
    const combined: Array<string> = [];

    if (baseSources && baseSources.length > 0) {
        combined.push(...baseSources.filter((value) => typeof value === 'string' && value.trim() !== ''));
    }

    for (const url of attachmentUrls) {
        const trimmed = String(url ?? '').trim();
        if (trimmed !== '') {
            combined.push(trimmed);
        }
    }

    return Array.from(new Set(combined));
}

/**
 * Merges tool definitions coming from commitments and runtime prompt overrides.
 *
 * @private internal helper for `AgentLlmExecutionTools`
 */
function mergePromptTools(
    ...toolLists: Array<ReadonlyArray<NonNullable<ChatPrompt['tools']>[number]> | undefined>
): Array<NonNullable<ChatPrompt['tools']>[number]> {
    const mergedTools: Array<NonNullable<ChatPrompt['tools']>[number]> = [];
    const seenToolNames = new Set<string>();

    for (const toolList of toolLists) {
        if (!toolList) {
            continue;
        }

        for (const tool of toolList) {
            if (!tool || seenToolNames.has(tool.name)) {
                continue;
            }

            mergedTools.push(tool);
            seenToolNames.add(tool.name);
        }
    }

    return mergedTools;
}

/**
 * Agent model requirements stripped of prompt-only bookkeeping before forwarding to runtime tools.
 *
 * @private internal helper for `AgentLlmExecutionTools`
 */
type SanitizedAgentModelRequirements = Omit<AgentModelRequirements, '_metadata' | 'promptSuffix'>;

/**
 * Prepared AgentKit agent shape reused while caching and dispatching AgentKit-backed runs.
 *
 * @private internal helper for `AgentLlmExecutionTools`
 */
type PreparedAgentKitAgent = Awaited<ReturnType<OpenAiAgentKitExecutionTools['prepareAgentKitAgent']>>;

/**
 * Prepared chat prompt enriched with agent requirements plus routing metadata for backend execution.
 *
 * @private internal helper for `AgentLlmExecutionTools`
 */
type PreparedAgentChatPrompt = {
    /**
     * Prompt forwarded to the underlying LLM execution tools after agent enrichment.
     */
    readonly forwardedPrompt: ChatPrompt;

    /**
     * Agent requirements after removing bookkeeping-only properties.
     */
    readonly sanitizedRequirements: SanitizedAgentModelRequirements;

    /**
     * Tool definitions merged from commitments and runtime prompt overrides.
     */
    readonly mergedTools: Array<NonNullable<ChatPrompt['tools']>[number]>;

    /**
     * Final knowledge sources forwarded to agent-capable backends.
     */
    readonly knowledgeSourcesForAgent?: Array<string>;

    /**
     * Whether runtime attachments added temporary knowledge sources for this prompt.
     */
    readonly hasAttachmentSources: boolean;

    /**
     * Whether runtime prompt tool overrides were supplied for this prompt.
     */
    readonly hasRuntimePromptTools: boolean;
};

/**
 * Cache data used while resolving one AgentKit execution.
 *
 * @private internal helper for `AgentLlmExecutionTools`
 */
type AgentKitCacheState = {
    /**
     * Whether the current prompt can safely reuse cached AgentKit resources.
     */
    readonly shouldUseCache: boolean;

    /**
     * AgentKit agent resolved from external preparation or cache, if available.
     */
    readonly preparedAgentKit: PreparedAgentKitAgent | null;

    /**
     * Reusable vector store id resolved from cache for this execution.
     */
    readonly vectorStoreId?: string;

    /**
     * Hash describing the current vector-store inputs.
     */
    readonly vectorStoreHash?: string;

    /**
     * Hash describing the prepared AgentKit instructions and tools.
     */
    readonly requirementsHash?: string;
};

/**
 * Computes one stable hash from a JSON-serializable value.
 *
 * @private internal helper for `AgentLlmExecutionTools`
 */
function computeJsonHash(value: unknown): string {
    return sha256(JSON.stringify(value)).toString();
}

/**
 * Detects whether one optional tool list contains runtime tools.
 *
 * @private internal helper for `AgentLlmExecutionTools`
 */
function hasPromptTools(tools: ReadonlyArray<NonNullable<ChatPrompt['tools']>[number]> | undefined): boolean {
    return Array.isArray(tools) && tools.length > 0;
}

/**
 * Builds the prompt forwarded to the underlying LLM tools after agent requirements are merged in.
 *
 * @private internal helper for `AgentLlmExecutionTools`
 */
function createPromptWithAgentModelRequirements(options: {
    /**
     * Original runtime chat prompt.
     */
    readonly chatPrompt: ChatPrompt;

    /**
     * Agent requirements safe to forward to runtime LLM tools.
     */
    readonly sanitizedRequirements: SanitizedAgentModelRequirements;

    /**
     * Optional suffix appended after attachment context.
     */
    readonly promptSuffix: AgentModelRequirements['promptSuffix'];

    /**
     * Prompt content after attachment context was inlined.
     */
    readonly chatPromptContentWithAttachments: string;

    /**
     * Tool list merged from commitments and runtime prompt overrides.
     */
    readonly mergedTools: Array<NonNullable<ChatPrompt['tools']>[number]>;

    /**
     * Knowledge sources forwarded to agent-capable backends.
     */
    readonly knowledgeSourcesForAgent?: Array<string>;
}): ChatPrompt {
    const chatPromptContentWithSuffix: string_prompt = options.promptSuffix
        ? (`${options.chatPromptContentWithAttachments}\n\n${options.promptSuffix}` as string_prompt)
        : (options.chatPromptContentWithAttachments as string_prompt);

    return {
        ...options.chatPrompt,
        content: chatPromptContentWithSuffix,
        modelRequirements: {
            ...options.chatPrompt.modelRequirements,
            ...options.sanitizedRequirements,
            tools: options.mergedTools.length > 0 ? options.mergedTools : undefined,
            // Spread knowledgeSources to convert readonly array to mutable
            knowledgeSources: options.knowledgeSourcesForAgent,
            // Prepend agent system message to existing system message
            systemMessage:
                options.sanitizedRequirements.systemMessage +
                (options.chatPrompt.modelRequirements.systemMessage
                    ? `\n\n${options.chatPrompt.modelRequirements.systemMessage}`
                    : ''),
        } as unknown as ChatPrompt['modelRequirements'], // Cast to avoid readonly mismatch from spread
    };
}

/**
 * Removes assistant-managed requirements before the prompt is executed via OpenAI Assistants.
 *
 * @private internal helper for `AgentLlmExecutionTools`
 */
function createOpenAiAssistantPrompt(chatPrompt: ChatPrompt): ChatPrompt {
    return {
        ...chatPrompt,
        modelRequirements: {
            ...chatPrompt.modelRequirements,
            modelName: undefined, // <- Note: Clear model name as it's defined by the Assistant
            systemMessage: undefined, // <- Note: Clear system message as it's already in the Assistant
            temperature: undefined, // <- Note: Let the Assistant use its default temperature
        },
    };
}

/**
 * Normalizes the final model content into the markdown shape expected from agents.
 *
 * @private internal helper for `AgentLlmExecutionTools`
 */
function normalizeAgentResultContent(content: CommonPromptResult['content'] | really_unknown): string_markdown {
    let normalizedContent = content as string_markdown | really_unknown;

    if (typeof normalizedContent === 'string') {
        // Note: Cleanup the AI artifacts from the content
        normalizedContent = humanizeAiText(normalizedContent);

        // Note: Make sure the content is Promptbook-like
        normalizedContent = promptbookifyAiText(normalizedContent as string_markdown);
    } else {
        // TODO: Maybe deep `humanizeAiText` + `promptbookifyAiText` inside of the object
        normalizedContent = JSON.stringify(normalizedContent);
    }

    return normalizedContent as string_markdown;
}

/**
 * Execution Tools for calling LLM models with a predefined agent "soul"
 * This wraps underlying LLM execution tools and applies agent-specific system prompts and requirements
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
export class AgentLlmExecutionTools implements LlmExecutionTools {
    /**
     * Cached AgentKit agents to avoid rebuilding identical instances.
     */
    private static agentKitAgentCache = new Map<
        string_title,
        {
            agent: Awaited<ReturnType<OpenAiAgentKitExecutionTools['prepareAgentKitAgent']>>['agent'];
            requirementsHash: string;
            vectorStoreId?: string;
        }
    >();

    /**
     * Cache of OpenAI assistants to avoid creating duplicates
     */
    private static assistantCache = new Map<
        string_title,
        {
            assistantId: string;
            requirementsHash: string;
        }
    >();

    /**
     * Cache of OpenAI vector stores to avoid creating duplicates
     */
    private static vectorStoreCache = new Map<
        string_title,
        {
            vectorStoreId: string;
            requirementsHash: string;
        }
    >();

    /**
     * Cached model requirements to avoid re-parsing the agent source
     */
    private _cachedModelRequirements: AgentModelRequirements | null = null;

    /**
     * Cached parsed agent information
     */
    private _cachedAgentInfo: ReturnType<typeof parseAgentSource> | null = null;

    /**
     * Creates new AgentLlmExecutionTools
     *
     * @param llmTools The underlying LLM execution tools to wrap
     * @param agentSource The agent source string that defines the agent's behavior
     */
    public constructor(protected readonly options: CreateAgentLlmExecutionToolsOptions) {}

    /**
     * Updates the agent source and clears the cache
     *
     * @param agentSource The new agent source string
     */
    protected updateAgentSource(agentSource: string_book): void {
        this.options.agentSource = agentSource;
        this._cachedAgentInfo = null;
        this._cachedModelRequirements = null;
    }

    /**
     * Get cached or parse agent information
     */
    private getAgentInfo() {
        if (this._cachedAgentInfo === null) {
            this._cachedAgentInfo = parseAgentSource(this.options.agentSource);
        }
        return this._cachedAgentInfo;
    }

    /**
     * Get cached or create agent model requirements
     *
     * Note: [🐤] This is names `getModelRequirements` *(not `getAgentModelRequirements`)* because in future these two will be united
     */
    public async getModelRequirements(): Promise<AgentModelRequirements> {
        if (this._cachedModelRequirements === null) {
            const preparationStartedAtMs = Date.now();

            if (this.options.isVerbose) {
                console.info('[🤰]', 'Preparing agent model requirements', {
                    agent: this.title,
                });
            }

            // Get available models from underlying LLM tools for best model selection
            const availableModelsStartedAtMs = Date.now();
            const availableModels = await this.options.llmTools.listModels();

            if (this.options.isVerbose) {
                console.info('[🤰]', 'Available models resolved for agent', {
                    agent: this.title,
                    modelCount: availableModels.length,
                    elapsedMs: Date.now() - availableModelsStartedAtMs,
                });
            }

            const requirementsStartedAtMs = Date.now();
            this._cachedModelRequirements = await createAgentModelRequirements(
                this.options.agentSource,
                undefined, // Let the function pick the best model
                availableModels,
            );

            if (this.options.isVerbose) {
                console.info('[🤰]', 'Agent model requirements ready', {
                    agent: this.title,
                    elapsedMs: Date.now() - requirementsStartedAtMs,
                    totalElapsedMs: Date.now() - preparationStartedAtMs,
                });
            }
        }
        return this._cachedModelRequirements;
    }

    public get title(): string_title & string_markdown_text {
        const agentInfo = this.getAgentInfo();
        return (agentInfo.meta.fullname || agentInfo.agentName || 'Agent') as string_title & string_markdown_text;
    }

    public get description(): string_markdown {
        const agentInfo = this.getAgentInfo();
        return agentInfo.personaDescription || 'AI Agent with predefined personality and behavior';
    }

    public get profile(): ChatParticipant | undefined {
        const agentInfo = this.getAgentInfo();

        if (!agentInfo.agentName) {
            return undefined;
        }

        return {
            name: agentInfo.agentName.toUpperCase().replace(/\s+/g, '_'),
            fullname: agentInfo.meta.fullname || agentInfo.agentName,
            color: agentInfo.meta.color || '#6366f1', // Default indigo color
            avatarSrc: agentInfo.meta.image,
        };
    }

    public checkConfiguration(): Promisable<void> {
        // Check underlying tools configuration
        return this.options.llmTools.checkConfiguration();
    }

    /**
     * Returns a virtual model name representing the agent behavior
     */
    public get modelName(): string_model_name {
        const hash = sha256(hexEncoder.parse(this.options.agentSource))
            //    <- TODO: [🥬] Encapsulate sha256 to some private utility function
            .toString(/* hex */);
        //    <- TODO: [🥬] Make some system for hashes and ids of promptbook

        const agentId = hash.substring(0, 10);
        //                    <- TODO: [🥬] Make some system for hashes and ids of promptbook

        return (normalizeToKebabCase(this.title) + '-' + agentId) as string_model_name;
    }

    public listModels(): Promisable<ReadonlyArray<AvailableModel>> {
        return [
            {
                modelName: this.modelName,
                modelVariant: 'CHAT',
                modelTitle: `${this.title} (Agent Chat Default)`,
                modelDescription: `Chat model with agent behavior: ${this.description}`,
            },
            // <- Note: We only list a single "virtual" agent model here as this wrapper only supports chat prompts
        ];
    }

    /**
     * Calls the chat model with agent-specific system prompt and requirements
     */
    public async callChatModel(prompt: Prompt): Promise<ChatPromptResult> {
        return this.callChatModelStream(prompt, () => {});
    }

    /**
     * Calls the chat model with agent-specific system prompt and requirements with streaming
     */
    public async callChatModelStream(
        prompt: Prompt,
        onProgress: (chunk: ChatPromptResult) => void,
        options?: CallChatModelStreamOptions,
    ): Promise<ChatPromptResult> {
        const preparedChatPrompt = await this.prepareChatPrompt(prompt);
        const underlyingLlmResult = await this.callPreparedChatModelStream({
            originalPrompt: prompt,
            preparedChatPrompt,
            onProgress,
            streamOptions: options,
        });

        return this.finalizeAgentResult(underlyingLlmResult);
    }

    /**
     * Ensures the agent wrapper only processes chat prompts.
     */
    private requireChatPrompt(prompt: Prompt): ChatPrompt {
        if (prompt.modelRequirements.modelVariant !== 'CHAT') {
            throw new Error('AgentLlmExecutionTools only supports chat prompts');
        }

        return prompt as ChatPrompt;
    }

    /**
     * Resolves agent requirements, attachments, and runtime overrides into one forwarded chat prompt.
     */
    private async prepareChatPrompt(prompt: Prompt): Promise<PreparedAgentChatPrompt> {
        const chatPrompt = this.requireChatPrompt(prompt);
        const { sanitizedRequirements, promptSuffix } = await this.getSanitizedAgentModelRequirements();
        const attachments = normalizeChatAttachments(chatPrompt.attachments);
        const attachmentUrls = attachments.map((attachment) => attachment.url);
        const mergedTools = mergePromptTools(
            sanitizedRequirements.tools,
            chatPrompt.modelRequirements.tools,
            chatPrompt.tools,
        );
        const hasRuntimePromptTools = hasPromptTools(chatPrompt.modelRequirements.tools) || hasPromptTools(chatPrompt.tools);
        const chatPromptContentWithAttachments = await appendChatAttachmentContextWithContent(
            chatPrompt.content,
            attachments,
            { allowLocalhost: true },
        );
        const knowledgeSourcesForAgentList = mergeKnowledgeSourcesWithAttachments(
            sanitizedRequirements.knowledgeSources,
            attachmentUrls,
        );
        const knowledgeSourcesForAgent =
            knowledgeSourcesForAgentList.length > 0 ? knowledgeSourcesForAgentList : undefined;
        const forwardedPrompt = createPromptWithAgentModelRequirements({
            chatPrompt,
            sanitizedRequirements,
            promptSuffix,
            chatPromptContentWithAttachments,
            mergedTools,
            knowledgeSourcesForAgent,
        });

        console.log('!!!! promptWithAgentModelRequirements:', forwardedPrompt);

        return {
            forwardedPrompt,
            sanitizedRequirements,
            mergedTools,
            knowledgeSourcesForAgent,
            hasAttachmentSources: attachmentUrls.length > 0,
            hasRuntimePromptTools,
        };
    }

    /**
     * Removes bookkeeping-only properties from compiled agent requirements before forwarding them.
     */
    private async getSanitizedAgentModelRequirements(): Promise<{
        /**
         * Prompt suffix that still needs to be appended to the runtime prompt content.
         */
        readonly promptSuffix: AgentModelRequirements['promptSuffix'];

        /**
         * Agent requirements safe to forward to runtime LLM tools.
         */
        readonly sanitizedRequirements: SanitizedAgentModelRequirements;
    }> {
        const modelRequirements = await this.getModelRequirements();
        const { _metadata, promptSuffix, ...sanitizedRequirements } = modelRequirements;

        keepUnused(_metadata);

        return {
            promptSuffix,
            sanitizedRequirements,
        };
    }

    /**
     * Dispatches one prepared agent prompt to the correct underlying LLM backend.
     */
    private async callPreparedChatModelStream(options: {
        /**
         * Original runtime prompt before agent enrichment.
         */
        readonly originalPrompt: Prompt;

        /**
         * Prepared prompt plus backend routing metadata.
         */
        readonly preparedChatPrompt: PreparedAgentChatPrompt;

        /**
         * Streaming callback forwarded to the underlying execution tools.
         */
        readonly onProgress: (chunk: ChatPromptResult) => void;

        /**
         * Optional stream controls propagated from the caller.
         */
        readonly streamOptions?: CallChatModelStreamOptions;
    }): Promise<CommonPromptResult> {
        const llmTools = this.options.llmTools;

        if (OpenAiAgentKitExecutionTools.isOpenAiAgentKitExecutionTools(llmTools)) {
            return this.callOpenAiAgentKitChatModelStream({
                llmTools,
                originalPrompt: options.originalPrompt,
                preparedChatPrompt: options.preparedChatPrompt,
                onProgress: options.onProgress,
                streamOptions: options.streamOptions,
            });
        }

        if (OpenAiAssistantExecutionTools.isOpenAiAssistantExecutionTools(llmTools)) {
            return this.callOpenAiAssistantChatModelStream({
                llmTools,
                originalPrompt: options.originalPrompt,
                preparedChatPrompt: options.preparedChatPrompt,
                onProgress: options.onProgress,
                streamOptions: options.streamOptions,
            });
        }

        return this.callGenericChatModelStream({
            preparedChatPrompt: options.preparedChatPrompt,
            onProgress: options.onProgress,
            streamOptions: options.streamOptions,
        });
    }

    /**
     * Runs one prepared prompt through the OpenAI AgentKit backend.
     */
    private async callOpenAiAgentKitChatModelStream(options: {
        /**
         * Underlying OpenAI AgentKit execution tools.
         */
        readonly llmTools: OpenAiAgentKitExecutionTools;

        /**
         * Original runtime prompt before agent enrichment.
         */
        readonly originalPrompt: Prompt;

        /**
         * Prepared prompt plus backend routing metadata.
         */
        readonly preparedChatPrompt: PreparedAgentChatPrompt;

        /**
         * Streaming callback forwarded to the underlying execution tools.
         */
        readonly onProgress: (chunk: ChatPromptResult) => void;

        /**
         * Optional stream controls propagated from the caller.
         */
        readonly streamOptions?: CallChatModelStreamOptions;
    }): Promise<CommonPromptResult> {
        const agentKitCacheState = this.resolveAgentKitCacheState({
            llmTools: options.llmTools,
            preparedChatPrompt: options.preparedChatPrompt,
        });
        const preparedAgentKit = await this.getOrPrepareAgentKitAgent({
            llmTools: options.llmTools,
            originalPrompt: options.originalPrompt,
            preparedChatPrompt: options.preparedChatPrompt,
            onProgress: options.onProgress,
            agentKitCacheState,
        });

        this.storeAgentKitCache({
            preparedAgentKit,
            agentKitCacheState,
        });

        const responseFormatOutputType = mapResponseFormatToAgentOutputType(
            options.preparedChatPrompt.forwardedPrompt.modelRequirements.responseFormat,
        );

        return options.llmTools.callChatModelStreamWithPreparedAgent({
            openAiAgentKitAgent: preparedAgentKit.agent,
            prompt: options.preparedChatPrompt.forwardedPrompt,
            onProgress: options.onProgress,
            responseFormatOutputType,
            signal: options.streamOptions?.signal,
        });
    }

    /**
     * Resolves the AgentKit cache state for the current prompt, including external and in-memory caches.
     */
    private resolveAgentKitCacheState(options: {
        /**
         * Underlying OpenAI AgentKit execution tools.
         */
        readonly llmTools: OpenAiAgentKitExecutionTools;

        /**
         * Prepared prompt plus backend routing metadata.
         */
        readonly preparedChatPrompt: PreparedAgentChatPrompt;
    }): AgentKitCacheState {
        const shouldUseCache =
            !options.preparedChatPrompt.hasAttachmentSources && !options.preparedChatPrompt.hasRuntimePromptTools;
        let preparedAgentKit =
            shouldUseCache && this.options.assistantPreparationMode === 'external'
                ? options.llmTools.getPreparedAgentKitAgent()
                : null;
        let vectorStoreId: string | undefined;
        let vectorStoreHash: string | undefined;
        let requirementsHash: string | undefined;

        if (shouldUseCache) {
            requirementsHash = computeJsonHash({
                ...options.preparedChatPrompt.sanitizedRequirements,
                knowledgeSources: options.preparedChatPrompt.knowledgeSourcesForAgent,
                tools: options.preparedChatPrompt.mergedTools,
            });
            vectorStoreHash = computeJsonHash(options.preparedChatPrompt.knowledgeSourcesForAgent ?? []);

            const cachedVectorStore = AgentLlmExecutionTools.vectorStoreCache.get(this.title);
            const cachedAgentKit = AgentLlmExecutionTools.agentKitAgentCache.get(this.title);

            vectorStoreId =
                preparedAgentKit?.vectorStoreId ||
                (cachedVectorStore && cachedVectorStore.requirementsHash === vectorStoreHash
                    ? cachedVectorStore.vectorStoreId
                    : undefined);

            if (!preparedAgentKit && cachedAgentKit && cachedAgentKit.requirementsHash === requirementsHash) {
                if (this.options.isVerbose) {
                    console.info('[🤰]', 'Using cached OpenAI AgentKit agent', {
                        agent: this.title,
                    });
                }

                preparedAgentKit = {
                    agent: cachedAgentKit.agent,
                    vectorStoreId: cachedAgentKit.vectorStoreId,
                };
            }
        }

        return {
            shouldUseCache,
            preparedAgentKit,
            vectorStoreId,
            vectorStoreHash,
            requirementsHash,
        };
    }

    /**
     * Returns a prepared AgentKit agent, creating one only when the cache could not satisfy the request.
     */
    private async getOrPrepareAgentKitAgent(options: {
        /**
         * Underlying OpenAI AgentKit execution tools.
         */
        readonly llmTools: OpenAiAgentKitExecutionTools;

        /**
         * Original runtime prompt before agent enrichment.
         */
        readonly originalPrompt: Prompt;

        /**
         * Prepared prompt plus backend routing metadata.
         */
        readonly preparedChatPrompt: PreparedAgentChatPrompt;

        /**
         * Streaming callback forwarded to the underlying execution tools.
         */
        readonly onProgress: (chunk: ChatPromptResult) => void;

        /**
         * Cache data already resolved for the current prompt.
         */
        readonly agentKitCacheState: AgentKitCacheState;
    }): Promise<PreparedAgentKitAgent> {
        if (options.agentKitCacheState.preparedAgentKit) {
            return options.agentKitCacheState.preparedAgentKit;
        }

        if (this.options.isVerbose) {
            console.info('[🤰]', 'Preparing OpenAI AgentKit agent', {
                agent: this.title,
            });
        }

        if (!options.agentKitCacheState.vectorStoreId && options.preparedChatPrompt.knowledgeSourcesForAgent?.length) {
            emitAssistantPreparationProgress({
                onProgress: options.onProgress,
                prompt: options.originalPrompt,
                modelName: this.modelName,
                phase: 'Creating knowledge base',
            });
        }

        emitAssistantPreparationProgress({
            onProgress: options.onProgress,
            prompt: options.originalPrompt,
            modelName: this.modelName,
            phase: 'Preparing AgentKit agent',
        });

        return options.llmTools.prepareAgentKitAgent({
            name: this.title,
            instructions: options.preparedChatPrompt.sanitizedRequirements.systemMessage || '',
            knowledgeSources: options.preparedChatPrompt.knowledgeSourcesForAgent,
            tools: options.preparedChatPrompt.mergedTools.length > 0 ? options.preparedChatPrompt.mergedTools : undefined,
            vectorStoreId: options.agentKitCacheState.shouldUseCache ? options.agentKitCacheState.vectorStoreId : undefined,
        });
    }

    /**
     * Stores freshly prepared AgentKit resources back into the in-memory caches when caching is allowed.
     */
    private storeAgentKitCache(options: {
        /**
         * Prepared AgentKit agent used for the current execution.
         */
        readonly preparedAgentKit: PreparedAgentKitAgent;

        /**
         * Cache data resolved for the current prompt.
         */
        readonly agentKitCacheState: AgentKitCacheState;
    }): void {
        if (!options.agentKitCacheState.shouldUseCache) {
            return;
        }

        if (options.agentKitCacheState.vectorStoreHash && options.preparedAgentKit.vectorStoreId) {
            AgentLlmExecutionTools.vectorStoreCache.set(this.title, {
                vectorStoreId: options.preparedAgentKit.vectorStoreId,
                requirementsHash: options.agentKitCacheState.vectorStoreHash,
            });
        }

        if (options.agentKitCacheState.requirementsHash) {
            AgentLlmExecutionTools.agentKitAgentCache.set(this.title, {
                agent: options.preparedAgentKit.agent,
                requirementsHash: options.agentKitCacheState.requirementsHash,
                vectorStoreId: options.preparedAgentKit.vectorStoreId,
            });
        }
    }

    /**
     * Runs one prepared prompt through the deprecated OpenAI Assistant backend.
     */
    private async callOpenAiAssistantChatModelStream(options: {
        /**
         * Underlying OpenAI Assistant execution tools.
         */
        readonly llmTools: OpenAiAssistantExecutionTools;

        /**
         * Original runtime prompt before agent enrichment.
         */
        readonly originalPrompt: Prompt;

        /**
         * Prepared prompt plus backend routing metadata.
         */
        readonly preparedChatPrompt: PreparedAgentChatPrompt;

        /**
         * Streaming callback forwarded to the underlying execution tools.
         */
        readonly onProgress: (chunk: ChatPromptResult) => void;

        /**
         * Optional stream controls propagated from the caller.
         */
        readonly streamOptions?: CallChatModelStreamOptions;
    }): Promise<CommonPromptResult> {
        const assistant = await this.getOrPrepareOpenAiAssistant({
            llmTools: options.llmTools,
            originalPrompt: options.originalPrompt,
            preparedChatPrompt: options.preparedChatPrompt,
            onProgress: options.onProgress,
        });
        const promptWithAgentModelRequirementsForOpenAiAssistantExecutionTools = createOpenAiAssistantPrompt(
            options.preparedChatPrompt.forwardedPrompt,
        );

        console.log(
            '!!!! promptWithAgentModelRequirementsForOpenAiAssistantExecutionTools:',
            promptWithAgentModelRequirementsForOpenAiAssistantExecutionTools,
        );

        return assistant.callChatModelStream(
            promptWithAgentModelRequirementsForOpenAiAssistantExecutionTools,
            options.onProgress,
            options.streamOptions,
        );
    }

    /**
     * Returns an assistant instance matching the current agent requirements, reusing caches when possible.
     */
    private async getOrPrepareOpenAiAssistant(options: {
        /**
         * Underlying OpenAI Assistant execution tools.
         */
        readonly llmTools: OpenAiAssistantExecutionTools;

        /**
         * Original runtime prompt before agent enrichment.
         */
        readonly originalPrompt: Prompt;

        /**
         * Prepared prompt plus backend routing metadata.
         */
        readonly preparedChatPrompt: PreparedAgentChatPrompt;

        /**
         * Streaming callback forwarded to the underlying execution tools.
         */
        readonly onProgress: (chunk: ChatPromptResult) => void;
    }): Promise<OpenAiAssistantExecutionTools> {
        const requirementsHash = computeJsonHash(options.preparedChatPrompt.sanitizedRequirements);
        const cachedAssistant = AgentLlmExecutionTools.assistantCache.get(this.title);
        const assistantTools = options.preparedChatPrompt.sanitizedRequirements.tools
            ? [...options.preparedChatPrompt.sanitizedRequirements.tools]
            : undefined;

        if (this.options.assistantPreparationMode === 'external') {
            if (this.options.isVerbose) {
                console.info('[🤰]', 'Using externally managed OpenAI Assistant', {
                    agent: this.title,
                    assistantId: options.llmTools.assistantId,
                });
            }

            this.storeAssistantCache(options.llmTools.assistantId, requirementsHash);
            return options.llmTools;
        }

        if (cachedAssistant && cachedAssistant.requirementsHash === requirementsHash) {
            if (this.options.isVerbose) {
                console.info('[🤰]', 'Using cached OpenAI Assistant', {
                    agent: this.title,
                    assistantId: cachedAssistant.assistantId,
                });
            }

            return options.llmTools.getAssistant(cachedAssistant.assistantId);
        }

        if (cachedAssistant) {
            if (this.options.isVerbose) {
                console.info('[🤰]', 'Updating OpenAI Assistant', {
                    agent: this.title,
                    assistantId: cachedAssistant.assistantId,
                });
            }

            emitAssistantPreparationProgress({
                onProgress: options.onProgress,
                prompt: options.originalPrompt,
                modelName: this.modelName,
                phase: 'Updating assistant',
            });

            const assistant = await options.llmTools.updateAssistant({
                assistantId: cachedAssistant.assistantId,
                name: this.title,
                instructions: options.preparedChatPrompt.sanitizedRequirements.systemMessage,
                knowledgeSources: options.preparedChatPrompt.sanitizedRequirements.knowledgeSources,
                tools: assistantTools,
            });

            this.storeAssistantCache(assistant.assistantId, requirementsHash);
            return assistant;
        }

        if (this.options.isVerbose) {
            console.info('[🤰]', 'Creating new OpenAI Assistant', {
                agent: this.title,
            });
        }

        // <- TODO: [🐱‍🚀] Check also `isCreatingNewAssistantsAllowed` and warn about it
        emitAssistantPreparationProgress({
            onProgress: options.onProgress,
            prompt: options.originalPrompt,
            modelName: this.modelName,
            phase: 'Creating assistant',
        });

        const assistant = await options.llmTools.createNewAssistant({
            name: this.title,
            instructions: options.preparedChatPrompt.sanitizedRequirements.systemMessage,
            knowledgeSources: options.preparedChatPrompt.sanitizedRequirements.knowledgeSources,
            tools: assistantTools,
            /*
            !!!
            metadata: {
                agentModelName: this.modelName,
            }
            */
        });

        this.storeAssistantCache(assistant.assistantId, requirementsHash);
        return assistant;
    }

    /**
     * Stores one assistant id in the shared assistant cache for this agent title.
     */
    private storeAssistantCache(assistantId: string, requirementsHash: string): void {
        AgentLlmExecutionTools.assistantCache.set(this.title, {
            assistantId,
            requirementsHash,
        });
    }

    /**
     * Runs one prepared prompt through generic LLM tools that do not need special assistant preparation.
     */
    private async callGenericChatModelStream(options: {
        /**
         * Prepared prompt plus backend routing metadata.
         */
        readonly preparedChatPrompt: PreparedAgentChatPrompt;

        /**
         * Streaming callback forwarded to the underlying execution tools.
         */
        readonly onProgress: (chunk: ChatPromptResult) => void;

        /**
         * Optional stream controls propagated from the caller.
         */
        readonly streamOptions?: CallChatModelStreamOptions;
    }): Promise<CommonPromptResult> {
        if (this.options.isVerbose) {
            console.log(`2️⃣ Creating Assistant ${this.title} on generic LLM execution tools...`);
        }

        if (this.options.llmTools.callChatModelStream) {
            return this.options.llmTools.callChatModelStream(
                options.preparedChatPrompt.forwardedPrompt,
                options.onProgress,
                options.streamOptions,
            );
        }

        if (this.options.llmTools.callChatModel) {
            const underlyingLlmResult = await this.options.llmTools.callChatModel(options.preparedChatPrompt.forwardedPrompt);
            options.onProgress(underlyingLlmResult as ChatPromptResult);
            return underlyingLlmResult;
        }

        throw new Error('Underlying LLM execution tools do not support chat model calls');
    }

    /**
     * Applies the final agent-level content normalization to the underlying LLM result.
     */
    private finalizeAgentResult(underlyingLlmResult: CommonPromptResult): ChatPromptResult {
        return {
            ...underlyingLlmResult,
            content: normalizeAgentResultContent(underlyingLlmResult.content as string_markdown | really_unknown),
            modelName: this.modelName,
        };
    }

    // Note: We intentionally do NOT implement callCompletionModel and callEmbeddingModel
    // as specified in the requirements - this agent wrapper only supports chat interactions
}

// TODO: [🍚] Implement Destroyable pattern to free resources
// TODO: [🧠] Adding parameter substitution support (here or should be responsibility of the underlying LLM Tools)
