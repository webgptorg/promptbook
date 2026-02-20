import type { Promisable } from 'type-fest';
import type { ChatParticipant } from '../book-components/Chat/types/ChatParticipant';
import type { Prompt } from '../types/Prompt';
import type { string_markdown, string_markdown_text, string_title } from '../types/typeAliases';
import type { AvailableModel } from './AvailableModel';
import type {
    ChatPromptResult,
    CompletionPromptResult,
    EmbeddingPromptResult,
    ImagePromptResult,
} from './PromptResult';

/**
 * Container for all the tools needed to execute prompts to large language models like GPT-4
 * On its interface it exposes common methods for prompt execution.
 * Inside (in constructor) it calls OpenAI, Azure, GPU, proxy, cache, logging,...
 *
 * Note: [🦖] There are several different things in Promptbook:
 * - `Agent` - which represents an AI Agent with its source, memories, actions, etc. Agent is a higher-level abstraction which is internally using:
 * - `LlmExecutionTools` - which wraps one or more LLM models and provides an interface to execute them
 * - `AgentLlmExecutionTools` - which is a specific implementation of `LlmExecutionTools` that wraps another LlmExecutionTools and applies agent-specific system prompts and requirements
 * - `OpenAiAssistantExecutionTools` - (Deprecated) which is a specific implementation of `LlmExecutionTools` for OpenAI models with assistant capabilities
 * - `OpenAiAgentKitExecutionTools` - which is a specific implementation of `LlmExecutionTools` backed by OpenAI AgentKit
 * - `RemoteAgent` - which is an `Agent` that connects to a Promptbook Agents Server
 *
 * @see https://github.com/webgptorg/promptbook#llm-execution-tools
 */
export type LlmExecutionTools = {
    /**
     * Title of the model provider
     *
     * @example "OpenAI"
     */
    readonly title: string_title & string_markdown_text;

    /**
     * Description of the provider
     *
     * @example "Use all models from OpenAI"
     */
    readonly description?: string_markdown;

    /**
     * Profile representing the model as a virtual persona for chat interfaces
     * This includes visual identity like avatar, colors, and display information
     *
     * @example { name: 'OPENAI', fullname: 'OpenAI GPT', color: '#10a37f', avatarSrc: '/openai-logo.png' }
     */
    readonly profile?: ChatParticipant;

    /**
     * Check comfiguration
     *
     * @returns nothing if configuration is correct
     * @throws {Error} if configuration is incorrect
     */
    checkConfiguration(): Promisable<void>;

    /**
     * List all available models that can be used
     */
    listModels(): Promisable<ReadonlyArray<AvailableModel>>;

    /**
     * Calls a chat model
     */
    callChatModel?(prompt: Prompt /* <- TODO: [🩱] ChatPrompt */): Promise<ChatPromptResult>;

    /**
     * Calls a chat model with streaming
     */
    callChatModelStream?(
        prompt: Prompt /* <- TODO: [🩱] ChatPrompt */,
        onProgress: (chunk: ChatPromptResult & { isFinished?: boolean }) => void,
    ): Promise<ChatPromptResult>;

    /**
     * Calls a voice chat model
     */
    callVoiceChatModel?(
        audio: Blob,
        prompt: Prompt,
    ): Promise<{ text: string; audio: Blob; userMessage?: string; agentMessage?: string }>;

    /**
     * Calls a completion model
     */
    callCompletionModel?(prompt: Prompt /* <- TODO: [🩱] CompletionPrompt */): Promise<CompletionPromptResult>;

    /**
     * Calls a image generation model
     */
    callImageGenerationModel?(prompt: Prompt /* <- TODO: [🩱] ImagePrompt */): Promise<ImagePromptResult>;

    /**
     * Calls an embedding model
     */
    callEmbeddingModel?(prompt: Prompt /* <- TODO: [🩱] EmbeddingPrompt */): Promise<EmbeddingPromptResult>;
};

/**
 * TODO: [🕛] Extend this from sth class -  like `AgentBasicInformation` / `ModelBasicInformation``
 * TODO: [🍚] Implement destroyable pattern to free resources
 * TODO: [🏳] Add `callTranslationModel`
 * TODO: [🧠] Emulation of one type of model with another one - emuate chat with completion; emulate translation with chat
 * TODO: [🍓][♐] Some heuristic to pick the best model in listed models
 * TODO: [🧠] Should or should not there be a word "GPT" in both callCompletionModel and callChatModel
 * TODO: [🧠][🪐] Should be common things like types, utils in folder containing A,B,C,.. or else outside this listing folder?
 */
