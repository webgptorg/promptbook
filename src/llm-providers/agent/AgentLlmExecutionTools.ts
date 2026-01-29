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
import type { ChatPrompt, Prompt } from '../../types/Prompt';
import type { string_markdown, string_markdown_text, string_model_name, string_title } from '../../types/typeAliases';
import { humanizeAiText } from '../../utils/markdown/humanizeAiText';
import { promptbookifyAiText } from '../../utils/markdown/promptbookifyAiText';
import { normalizeToKebabCase } from '../../utils/normalization/normalize-to-kebab-case';
import { OpenAiAgentExecutionTools } from '../openai/OpenAiAgentExecutionTools';
import { OpenAiAssistantExecutionTools } from '../openai/OpenAiAssistantExecutionTools';
import type { OpenAiExecutionTools } from '../openai/OpenAiExecutionTools';
import type { CreateAgentLlmExecutionToolsOptions } from './CreateAgentLlmExecutionToolsOptions';

/**
 * Execution Tools for calling LLM models with a predefined agent "soul"
 * This wraps underlying LLM execution tools and applies agent-specific system prompts and requirements
 *
 * Note: [🦖] There are several different things in Promptbook:
 * - `Agent` - which represents an AI Agent with its source, memories, actions, etc. Agent is a higher-level abstraction which is internally using:
 * - `LlmExecutionTools` - which wraps one or more LLM models and provides an interface to execute them
 * - `AgentLlmExecutionTools` - which is a specific implementation of `LlmExecutionTools` that wraps another LlmExecutionTools and applies agent-specific system prompts and requirements
 * - `OpenAiAgentExecutionTools` - which is a specific implementation of `LlmExecutionTools` for OpenAI models with agent capabilities (using Responses API), recommended for usage in `Agent` or `AgentLlmExecutionTools`
 * - `OpenAiAssistantExecutionTools` - (Deprecated) which is a specific implementation of `LlmExecutionTools` for OpenAI models with assistant capabilities
 * - `RemoteAgent` - which is an `Agent` that connects to a Promptbook Agents Server
 *
 * @public exported from `@promptbook/core`
 */
export class AgentLlmExecutionTools implements LlmExecutionTools {
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
            // Get available models from underlying LLM tools for best model selection
            const availableModels = await this.options.llmTools.listModels();
            this._cachedModelRequirements = await createAgentModelRequirements(
                this.options.agentSource,
                undefined, // Let the function pick the best model
                availableModels,
            );
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

        const chatPrompt = prompt as ChatPrompt;
        let underlyingLlmResult: CommonPromptResult;

        // Create modified chat prompt with agent system message
        const promptWithAgentModelRequirements: ChatPrompt = {
            ...chatPrompt,
            modelRequirements: {
                ...chatPrompt.modelRequirements,
                ...modelRequirements,
                // Spread tools to convert readonly array to mutable
                tools: modelRequirements.tools ? [...modelRequirements.tools] : chatPrompt.modelRequirements.tools,
                // Spread knowledgeSources to convert readonly array to mutable
                knowledgeSources: modelRequirements.knowledgeSources
                    ? [...modelRequirements.knowledgeSources]
                    : undefined,
                // Prepend agent system message to existing system message
                systemMessage:
                    modelRequirements.systemMessage +
                    (chatPrompt.modelRequirements.systemMessage
                        ? `\n\n${chatPrompt.modelRequirements.systemMessage}`
                        : ''),
            } as unknown as ChatPrompt['modelRequirements'], // Cast to avoid readonly mismatch from spread
        };

        const usesOpenAiResponses =
            OpenAiAgentExecutionTools.isOpenAiAgentExecutionTools(this.options.llmTools) ||
            OpenAiAssistantExecutionTools.isOpenAiAssistantExecutionTools(this.options.llmTools);

        if (usesOpenAiResponses) {
            if (
                OpenAiAssistantExecutionTools.isOpenAiAssistantExecutionTools(this.options.llmTools) &&
                this.options.isVerbose
            ) {
                console.warn(
                    'OpenAiAssistantExecutionTools is deprecated for Agent; falling back to Responses API tools.',
                );
            }

            const agentTools = await this.createOpenAiAgentTools(modelRequirements);

            const promptForAgent: ChatPrompt = {
                ...promptWithAgentModelRequirements,
                modelRequirements: {
                    ...promptWithAgentModelRequirements.modelRequirements,
                    knowledgeSources: modelRequirements.knowledgeSources
                        ? [...modelRequirements.knowledgeSources]
                        : undefined,
                },
            };

            underlyingLlmResult = await agentTools.callChatModelStream(promptForAgent, onProgress);
        } else {
            if (this.options.isVerbose) {
                console.log(`Using generic LLM execution tools for agent ${this.title}...`);
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

    /**
     * Creates OpenAI Responses tools for the agent, including vector store caching for knowledge sources.
     *
     * @param modelRequirements - Parsed agent model requirements.
     */
    private async createOpenAiAgentTools(
        modelRequirements: AgentModelRequirements,
    ): Promise<OpenAiAgentExecutionTools> {
        const requirementsHash = sha256(JSON.stringify(modelRequirements)).toString();
        const cached = AgentLlmExecutionTools.vectorStoreCache.get(this.title);

        let vectorStoreId: string | undefined;

        if (cached && cached.requirementsHash === requirementsHash) {
            if (this.options.isVerbose) {
                console.log(`Using cached OpenAI Agent vector store for agent ${this.title}...`);
            }
            vectorStoreId = cached.vectorStoreId;
        }

        if (!vectorStoreId && OpenAiAgentExecutionTools.isOpenAiAgentExecutionTools(this.options.llmTools)) {
            vectorStoreId = this.options.llmTools.vectorStoreId;
        }

        if (!vectorStoreId && modelRequirements.knowledgeSources && modelRequirements.knowledgeSources.length > 0) {
            if (this.options.isVerbose) {
                console.log(`Creating or updating OpenAI Agent vector store for agent ${this.title}...`);
            }

            const client = await (this.options.llmTools as OpenAiExecutionTools).getClient();
            vectorStoreId = await OpenAiAgentExecutionTools.createVectorStore(
                client,
                this.title,
                modelRequirements.knowledgeSources,
            );
        }

        if (vectorStoreId) {
            AgentLlmExecutionTools.vectorStoreCache.set(this.title, {
                vectorStoreId,
                requirementsHash,
            });
        }

        return OpenAiAgentExecutionTools.fromOpenAiTools(this.options.llmTools as OpenAiExecutionTools, {
            vectorStoreId,
        });
    }

    // Note: We intentionally do NOT implement callCompletionModel and callEmbeddingModel
    // as specified in the requirements - this agent wrapper only supports chat interactions
}

/**
 * TODO: [🍚] Implement Destroyable pattern to free resources
 * TODO: [🧠] Adding parameter substitution support (here or should be responsibility of the underlying LLM Tools)
 */
