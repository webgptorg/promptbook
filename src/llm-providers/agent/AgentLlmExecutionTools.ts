import { SHA256 as sha256 } from 'crypto-js';
import hexEncoder from 'crypto-js/enc-hex';
import type { Promisable } from 'type-fest';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { createAgentModelRequirements } from '../../book-2.0/agent-source/createAgentModelRequirements';
import { parseAgentSource } from '../../book-2.0/agent-source/parseAgentSource';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import type { ChatParticipant } from '../../book-components/Chat/types/ChatParticipant';
import type { AvailableModel } from '../../execution/AvailableModel';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
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
import { humanizeAiText } from '../../utils/markdown/humanizeAiText';
import { promptbookifyAiText } from '../../utils/markdown/promptbookifyAiText';
import { $getCurrentDate } from '../../utils/misc/$getCurrentDate';
import { normalizeToKebabCase } from '../../utils/normalization/normalize-to-kebab-case';
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
    ): Promise<ChatPromptResult> {
        // Ensure we're working with a chat prompt
        if (prompt.modelRequirements.modelVariant !== 'CHAT') {
            throw new Error('AgentLlmExecutionTools only supports chat prompts');
        }

        const modelRequirements = await this.getModelRequirements();
        const {
            metadata: _metadata,
            notes: _notes,
            parentAgentUrl: _parentAgentUrl,
            promptSufix,
            ...sanitizedRequirements
        } = modelRequirements;

        const chatPrompt = prompt as ChatPrompt;
        let underlyingLlmResult: CommonPromptResult;

        // Create modified chat prompt with agent system message
        const promptSuffix = promptSufix?.trim();
        const chatPromptContentWithSuffix: string_prompt = promptSuffix
            ? `${chatPrompt.content}\n\n${promptSuffix}` as string_prompt
            : (chatPrompt.content as string_prompt);

        const promptWithAgentModelRequirements: ChatPrompt = {
            ...chatPrompt,
            content: chatPromptContentWithSuffix,
            modelRequirements: {
                ...chatPrompt.modelRequirements,
                ...sanitizedRequirements,
                // Spread tools to convert readonly array to mutable
                tools: sanitizedRequirements.tools ? [...sanitizedRequirements.tools] : chatPrompt.modelRequirements.tools,
                // Spread knowledgeSources to convert readonly array to mutable
                knowledgeSources: sanitizedRequirements.knowledgeSources
                    ? [...sanitizedRequirements.knowledgeSources]
                    : undefined,
                // Prepend agent system message to existing system message
                systemMessage:
                    sanitizedRequirements.systemMessage +
                    (chatPrompt.modelRequirements.systemMessage
                        ? `\n\n${chatPrompt.modelRequirements.systemMessage}`
                        : ''),
            } as unknown as ChatPrompt['modelRequirements'], // Cast to avoid readonly mismatch from spread
        };

        console.log('!!!! promptWithAgentModelRequirements:', promptWithAgentModelRequirements);

        if (OpenAiAgentKitExecutionTools.isOpenAiAgentKitExecutionTools(this.options.llmTools)) {
            const requirementsHash = sha256(JSON.stringify(sanitizedRequirements)).toString();
            const vectorStoreHash = sha256(JSON.stringify(sanitizedRequirements.knowledgeSources ?? [])).toString();
            const cachedVectorStore = AgentLlmExecutionTools.vectorStoreCache.get(this.title);
            const cachedAgentKit = AgentLlmExecutionTools.agentKitAgentCache.get(this.title);
            let preparedAgentKit =
                this.options.assistantPreparationMode === 'external'
                    ? this.options.llmTools.getPreparedAgentKitAgent()
                    : null;

            const vectorStoreId =
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

            if (!preparedAgentKit) {
                if (this.options.isVerbose) {
                    console.info('[🤰]', 'Preparing OpenAI AgentKit agent', {
                        agent: this.title,
                    });
                }

                if (!vectorStoreId && sanitizedRequirements.knowledgeSources?.length) {
                    emitAssistantPreparationProgress({
                        onProgress,
                        prompt,
                        modelName: this.modelName,
                        phase: 'Creating knowledge base',
                    });
                }

                emitAssistantPreparationProgress({
                    onProgress,
                    prompt,
                    modelName: this.modelName,
                    phase: 'Preparing AgentKit agent',
                });

                preparedAgentKit = await this.options.llmTools.prepareAgentKitAgent({
                    name: this.title,
                    instructions: sanitizedRequirements.systemMessage || '',
                    knowledgeSources: sanitizedRequirements.knowledgeSources,
                    tools: sanitizedRequirements.tools ? [...sanitizedRequirements.tools] : undefined,
                    vectorStoreId,
                });
            }

            if (preparedAgentKit.vectorStoreId) {
                AgentLlmExecutionTools.vectorStoreCache.set(this.title, {
                    vectorStoreId: preparedAgentKit.vectorStoreId,
                    requirementsHash: vectorStoreHash,
                });
            }

            AgentLlmExecutionTools.agentKitAgentCache.set(this.title, {
                agent: preparedAgentKit.agent,
                requirementsHash,
                vectorStoreId: preparedAgentKit.vectorStoreId,
            });

            const responseFormatOutputType = mapResponseFormatToAgentOutputType(
                promptWithAgentModelRequirements.modelRequirements.responseFormat,
            );

            underlyingLlmResult = await this.options.llmTools.callChatModelStreamWithPreparedAgent({
                openAiAgentKitAgent: preparedAgentKit.agent,
                prompt: promptWithAgentModelRequirements,
                onProgress,
                responseFormatOutputType,
            });
        } else if (OpenAiAssistantExecutionTools.isOpenAiAssistantExecutionTools(this.options.llmTools)) {
            // ... deprecated path ...
            const requirementsHash = sha256(JSON.stringify(sanitizedRequirements)).toString();
            const cached = AgentLlmExecutionTools.assistantCache.get(this.title);
            let assistant: OpenAiAssistantExecutionTools;

            if (this.options.assistantPreparationMode === 'external') {
                assistant = this.options.llmTools;

                if (this.options.isVerbose) {
                    console.info('[🤰]', 'Using externally managed OpenAI Assistant', {
                        agent: this.title,
                        assistantId: assistant.assistantId,
                    });
                }

                AgentLlmExecutionTools.assistantCache.set(this.title, {
                    assistantId: assistant.assistantId,
                    requirementsHash,
                });
            } else if (cached) {
                if (cached.requirementsHash === requirementsHash) {
                    if (this.options.isVerbose) {
                        console.info('[🤰]', 'Using cached OpenAI Assistant', {
                            agent: this.title,
                            assistantId: cached.assistantId,
                        });
                    }
                    assistant = this.options.llmTools.getAssistant(cached.assistantId);
                } else {
                    if (this.options.isVerbose) {
                        console.info('[🤰]', 'Updating OpenAI Assistant', {
                            agent: this.title,
                            assistantId: cached.assistantId,
                        });
                    }
                    emitAssistantPreparationProgress({
                        onProgress,
                        prompt,
                        modelName: this.modelName,
                        phase: 'Updating assistant',
                    });
                    assistant = await this.options.llmTools.updateAssistant({
                    assistantId: cached.assistantId,
                    name: this.title,
                    instructions: sanitizedRequirements.systemMessage,
                    knowledgeSources: sanitizedRequirements.knowledgeSources,
                    tools: sanitizedRequirements.tools ? [...sanitizedRequirements.tools] : undefined,
                });
                    AgentLlmExecutionTools.assistantCache.set(this.title, {
                        assistantId: assistant.assistantId,
                        requirementsHash,
                    });
                }
            } else {
                if (this.options.isVerbose) {
                    console.info('[🤰]', 'Creating new OpenAI Assistant', {
                        agent: this.title,
                    });
                }
                // <- TODO: [🐱‍🚀] Check also `isCreatingNewAssistantsAllowed` and warn about it
                emitAssistantPreparationProgress({
                    onProgress,
                    prompt,
                    modelName: this.modelName,
                    phase: 'Creating assistant',
                });
                assistant = await this.options.llmTools.createNewAssistant({
                    name: this.title,
                    instructions: sanitizedRequirements.systemMessage,
                    knowledgeSources: sanitizedRequirements.knowledgeSources,
                    tools: sanitizedRequirements.tools ? [...sanitizedRequirements.tools] : undefined,
                    /*
                    !!!
                    metadata: {
                        agentModelName: this.modelName,
                    }
                    */
                });

                AgentLlmExecutionTools.assistantCache.set(this.title, {
                    assistantId: assistant.assistantId,
                    requirementsHash,
                });
            }

            // Create modified chat prompt with agent system message specific to OpenAI Assistant
            const promptWithAgentModelRequirementsForOpenAiAssistantExecutionTools: ChatPrompt = {
                ...promptWithAgentModelRequirements,
                modelRequirements: {
                    ...promptWithAgentModelRequirements.modelRequirements,
                    modelName: undefined, // <- Note: Clear model name as it's defined by the Assistant
                    systemMessage: undefined, // <- Note: Clear system message as it's already in the Assistant
                    temperature: undefined, // <- Note: Let the Assistant use its default temperature
                },
            };

            console.log(
                '!!!! promptWithAgentModelRequirementsForOpenAiAssistantExecutionTools:',
                promptWithAgentModelRequirementsForOpenAiAssistantExecutionTools,
            );

            underlyingLlmResult = await assistant.callChatModelStream(
                promptWithAgentModelRequirementsForOpenAiAssistantExecutionTools,
                onProgress,
            );
        } else {
            if (this.options.isVerbose) {
                console.log(`2️⃣ Creating Assistant ${this.title} on generic LLM execution tools...`);
            }

            if (this.options.llmTools.callChatModelStream) {
                underlyingLlmResult = await this.options.llmTools.callChatModelStream(
                    promptWithAgentModelRequirements,
                    onProgress,
                );
            } else if (this.options.llmTools.callChatModel) {
                underlyingLlmResult = await this.options.llmTools.callChatModel(promptWithAgentModelRequirements);
                onProgress(underlyingLlmResult as ChatPromptResult);
            } else {
                throw new Error('Underlying LLM execution tools do not support chat model calls');
            }
        }

        let content = underlyingLlmResult.content as string_markdown;

        // Note: Cleanup the AI artifacts from the content
        content = humanizeAiText(content);

        // Note: Make sure the content is Promptbook-like
        content = promptbookifyAiText(content);

        const agentResult: ChatPromptResult = {
            ...underlyingLlmResult,
            content,
            modelName: this.modelName,
        };

        return agentResult;
    }

    // Note: We intentionally do NOT implement callCompletionModel and callEmbeddingModel
    // as specified in the requirements - this agent wrapper only supports chat interactions
}

/**
 * TODO: [🍚] Implement Destroyable pattern to free resources
 * TODO: [🧠] Adding parameter substitution support (here or should be responsibility of the underlying LLM Tools)
 */
