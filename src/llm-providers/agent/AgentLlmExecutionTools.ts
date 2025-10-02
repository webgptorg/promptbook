import type { Promisable } from 'type-fest';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { createAgentModelRequirements } from '../../book-2.0/agent-source/createAgentModelRequirements';
import { parseAgentSource } from '../../book-2.0/agent-source/parseAgentSource';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import type { ChatParticipant } from '../../book-components/Chat/types/ChatParticipant';
import type { AvailableModel } from '../../execution/AvailableModel';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { ChatPromptResult } from '../../execution/PromptResult';
import type { ChatPrompt, Prompt } from '../../types/Prompt';
import type { string_markdown, string_markdown_text, string_title } from '../../types/typeAliases';

/**
 * Execution Tools for calling LLM models with a predefined agent "soul"
 * This wraps underlying LLM execution tools and applies agent-specific system prompts and requirements
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
    constructor(private readonly llmTools: LlmExecutionTools, private readonly agentSource: string_book) {}

    /**
     * Get cached or parse agent information
     */
    private getAgentInfo() {
        if (this._cachedAgentInfo === null) {
            this._cachedAgentInfo = parseAgentSource(this.agentSource);
        }
        return this._cachedAgentInfo;
    }

    /**
     * Get cached or create agent model requirements
     */
    private async getAgentModelRequirements(): Promise<AgentModelRequirements> {
        if (this._cachedModelRequirements === null) {
            // Get available models from underlying LLM tools for best model selection
            const availableModels = await this.llmTools.listModels();
            this._cachedModelRequirements = await createAgentModelRequirements(
                this.agentSource,
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
        return this.llmTools.checkConfiguration();
    }

    public listModels(): Promisable<ReadonlyArray<AvailableModel>> {
        return [
            {
                modelName: 'agent-007-!!!',
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
        if (!this.llmTools.callChatModel) {
            throw new Error('Underlying LLM execution tools do not support chat model calls');
        }

        // Ensure we're working with a chat prompt
        if (prompt.modelRequirements.modelVariant !== 'CHAT') {
            throw new Error('AgentLlmExecutionTools only supports chat prompts');
        }

        const chatPrompt = prompt as ChatPrompt;

        // Get agent model requirements (cached with best model selection)
        const modelRequirements = await this.getAgentModelRequirements();

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

        // Call underlying chat model with modified prompt
        return this.llmTools.callChatModel(modifiedChatPrompt);
    }

    // Note: We intentionally do NOT implement callCompletionModel and callEmbeddingModel
    // as specified in the requirements - this agent wrapper only supports chat interactions
}

/**
 * TODO: [🍚] Implement Destroyable pattern to free resources
 * TODO: [🧠] Adding parameter substitution support (here or should be responsibility of the underlying LLM Tools)
 */
