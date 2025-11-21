import { SHA256 as sha256 } from 'crypto-js';
import hexEncoder from 'crypto-js/enc-hex';
import type { Promisable } from 'type-fest';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { createAgentModelRequirements } from '../../book-2.0/agent-source/createAgentModelRequirements';
import { parseAgentSource } from '../../book-2.0/agent-source/parseAgentSource';
import type { ChatParticipant } from '../../book-components/Chat/types/ChatParticipant';
import type { AvailableModel } from '../../execution/AvailableModel';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { ChatPromptResult, CommonPromptResult } from '../../execution/PromptResult';
import type { ChatPrompt, Prompt } from '../../types/Prompt';
import type { string_markdown, string_markdown_text, string_model_name, string_title } from '../../types/typeAliases';
import { humanizeAiText } from '../../utils/markdown/humanizeAiText';
import { promptbookifyAiText } from '../../utils/markdown/promptbookifyAiText';
import { normalizeToKebabCase } from '../../utils/normalization/normalize-to-kebab-case';
import { OpenAiAssistantExecutionTools } from '../openai/OpenAiAssistantExecutionTools';
import type { CreateAgentLlmExecutionToolsOptions } from './CreateAgentLlmExecutionToolsOptions';

/**
 * Execution Tools for calling LLM models with a predefined agent "soul"
 * This wraps underlying LLM execution tools and applies agent-specific system prompts and requirements
 *
 * !!! Note: [🦖] There are several different things in Promptbook:
 * - `Agent` - which represents an AI Agent with its source, memories, actions, etc. Agent is a higher-level abstraction which is internally using:
 * - `LlmExecutionTools` - which wraps one or more LLM models and provides an interface to execute them
 * - `AgentLlmExecutionTools` - which is a specific implementation of `LlmExecutionTools` that wraps another LlmExecutionTools and applies agent-specific system prompts and requirements
 * - `OpenAiAssistantExecutionTools` - which is a specific implementation of `LlmExecutionTools` for OpenAI models with assistant capabilities, recommended for usage in `Agent` or `AgentLlmExecutionTools`
 *
 * @public exported from `@promptbook/core`
 */
export class AgentLlmExecutionTools implements LlmExecutionTools {
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
    constructor(private readonly options: CreateAgentLlmExecutionToolsOptions) {}

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
     */
    private async getAgentModelRequirements(): Promise<AgentModelRequirements> {
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
        return (agentInfo.agentName || 'Agent') as string_title & string_markdown_text;
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
            fullname: agentInfo.agentName,
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
        if (!this.options.llmTools.callChatModel) {
            throw new Error('Underlying LLM execution tools do not support chat model calls');
        }

        // Ensure we're working with a chat prompt
        if (prompt.modelRequirements.modelVariant !== 'CHAT') {
            throw new Error('AgentLlmExecutionTools only supports chat prompts');
        }

        const modelRequirements = await this.getAgentModelRequirements();

        const chatPrompt = prompt as ChatPrompt;
        let underlyingLlmResult: CommonPromptResult;

        if (OpenAiAssistantExecutionTools.isOpenAiAssistantExecutionTools(this.options.llmTools)) {
            if (this.options.isVerbose) {
                console.log(`Creating new OpenAI Assistant for agent ${this.title}...`);
            }
            // <- TODO: !!! Check also `isCreatingNewAssistantsAllowed` and warn about it
            const assistant = await this.options.llmTools.createNewAssistant({
                name: this.title,
                instructions: modelRequirements.systemMessage,
                knowledgeSources: modelRequirements.knowledgeSources,
                /*
                !!!
                metadata: {
                    agentModelName: this.modelName,
                }
                */
            });
            // <- TODO: !!! Cache the assistant in prepareCache

            underlyingLlmResult = await assistant.callChatModel(chatPrompt);
        } else {
            if (this.options.isVerbose) {
                console.log(`Creating Assistant ${this.title} on generic LLM execution tools...`);
            }
            // Create modified chat prompt with agent system message
            const modifiedChatPrompt: ChatPrompt = {
                ...chatPrompt,
                modelRequirements: {
                    ...chatPrompt.modelRequirements,
                    ...modelRequirements,
                    // Prepend agent system message to existing system message
                    systemMessage:
                        modelRequirements.systemMessage +
                        (chatPrompt.modelRequirements.systemMessage
                            ? `\n\n${chatPrompt.modelRequirements.systemMessage}`
                            : ''),
                },
            };

            underlyingLlmResult = await this.options.llmTools.callChatModel(modifiedChatPrompt);
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
