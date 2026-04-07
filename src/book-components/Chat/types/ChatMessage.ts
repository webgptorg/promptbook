import { Message } from '../../../types/Message';
import type { LlmToolDefinition } from '../../../types/LlmToolDefinition';
import type { ChatModelRequirements } from '../../../types/ModelRequirements';
import type { ToolCall } from '../../../types/ToolCall';
import type { TODO_object } from '../../../utils/organization/TODO_object';
import type {
    id,
    Parameters,
    string_date_iso8601,
    string_markdown,
    string_prompt,
    string_title,
} from '../../../types/typeAliases';

export type ChatToolCall = ToolCall;

/**
 * One item in a user-facing progress card shown while assistant response is still running.
 *
 * @public exported from `@promptbook/components`
 */
export type ChatProgressItem = {
    /**
     * Stable item id used for incremental updates.
     */
    readonly id: string;

    /**
     * Item text in markdown.
     */
    readonly text: string_markdown;

    /**
     * Item status shown by the UI.
     */
    readonly status: 'pending' | 'completed';
};

/**
 * Structured progress card rendered in place of generic thinking placeholders.
 *
 * @public exported from `@promptbook/components`
 */
export type ChatProgressCard = {
    /**
     * Optional title shown at the top of the panel.
     */
    readonly title?: string_markdown;

    /**
     * Optional markdown section describing current work.
     */
    readonly now?: string_markdown;

    /**
     * Optional markdown section describing upcoming work.
     */
    readonly next?: string_markdown;

    /**
     * Ordered bullet items representing in-progress or completed tasks.
     */
    readonly items: ReadonlyArray<ChatProgressItem>;

    /**
     * Optional timestamp when this card was last updated.
     */
    readonly updatedAt?: string_date_iso8601;

    /**
     * Optional visibility flag allowing explicit panel hide before final answer.
     */
    readonly isVisible?: boolean;
};

/**
 * Serializable prompt snapshot stored alongside one assistant message for debugging and inspection.
 */
type ChatMessagePrompt = {
    /**
     * Human-readable label used for the prompt execution.
     */
    readonly title: string_title;

    /**
     * User-facing chat content submitted into the prompt pipeline.
     */
    readonly content: string_prompt;

    /**
     * Resolved prompt parameters passed into the agent turn.
     */
    readonly parameters: Parameters;

    /**
     * Chat-model requirements used when the turn was executed.
     */
    readonly modelRequirements: ChatModelRequirements;

    /**
     * Prior thread history provided to the prompt.
     */
    readonly thread?: ReadonlyArray<ChatMessage>;

    /**
     * Attachments submitted with the user turn.
     */
    readonly attachments?: ReadonlyArray<{
        name: string;
        type: string;
        url: string;
    }>;

    /**
     * Runtime tools explicitly passed on the chat prompt object.
     */
    readonly tools?: ReadonlyArray<LlmToolDefinition>;

    /**
     * Full list of tools available to the model for this turn.
     */
    readonly availableTools?: ReadonlyArray<LlmToolDefinition>;

    /**
     * Tool calls associated with the generated message, duplicated here for raw prompt inspection.
     */
    readonly toolCalls?: ReadonlyArray<ChatToolCall>;

    /**
     * Completed tool calls associated with the generated message, duplicated here for raw prompt inspection.
     */
    readonly completedToolCalls?: ReadonlyArray<ChatToolCall>;

    /**
     * Provider-facing prompt text after agent/runtime preparation, when available.
     */
    readonly rawPromptContent?: string_prompt;

    /**
     * Provider-facing raw request payload, when available.
     */
    readonly rawRequest?: TODO_object | null;
};

/**
 * Represents a single message within a chat interface.
 *
 * This type extends the base `Message` type by omitting internal routing fields
 * and adding chat-specific properties like markdown content and generation status.
 *
 * @public exported from `@promptbook/components`
 */
export type ChatMessage = Omit<Message<id>, 'direction' | 'recipients' | 'threadId' | 'metadata' | 'createdAt'> & {
    /**
     * Force the channel to be 'PROMPTBOOK_CHAT'
     *
     * @default 'PROMPTBOOK_CHAT'
     */
    channel?: 'PROMPTBOOK_CHAT';

    /**
     * The content of the message with optional markdown formatting
     */
    content: string_markdown;

    /**
     * ISO 8601 timestamp for when the message was sent
     */
    createdAt?: string_date_iso8601;

    /**
     * Optional duration of agent message generation in milliseconds
     */
    generationDurationMs?: number;

    /**
     * Durable lifecycle state tracked by server-owned chat implementations.
     */
    lifecycleState?: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

    /**
     * Optional failure/cancellation explanation persisted with the message.
     */
    lifecycleError?: string;

    /**
     * Optional client-generated idempotency key associated with the originating user message.
     */
    clientMessageId?: string;

    /**
     * Optional durable job id responsible for generating this assistant message.
     */
    jobId?: string;

    /**
     * Whether the message is complete (for example, if it's still being generated by an AI)
     *
     * @default true
     */
    isComplete?: boolean;

    /**
     * The expected answer for the message (used for testing or validation)
     */
    expectedAnswer?: string;

    /**
     * Indicates if the message was sent via a voice call
     */
    isVoiceCall?: boolean;

    /**
     * Optional tool calls made during the execution
     */
    readonly ongoingToolCalls?: ReadonlyArray<ChatToolCall>;

    /**
     * Optional tool calls used to produce this message.
     */
    readonly toolCalls?: ReadonlyArray<ChatToolCall>;

    /**
     * Optional tool calls that have been completed
     *
     * @deprecated Use `toolCalls` instead.
     */
    readonly completedToolCalls?: ReadonlyArray<ChatToolCall>;

    /**
     * Optional file attachments
     */
    attachments?: Array<{
        /**
         * The name of the file
         */
        name: string;

        /**
         * The type of the file
         */
        type: string;

        /**
         * The URL where the file is stored
         */
        url: string;
    }>;

    /**
     * Optional source citations/annotations (from RAG systems like OpenAI Assistants)
     */
    readonly citations?: ReadonlyArray<{
        /**
         * The unique identifier for the citation (e.g., "5:13")
         */
        id: string;

        /**
         * The source document name (e.g., "document.pdf")
         */
        source: string;

        /**
         * Optional URL to the source document
         */
        url?: string;

        /**
         * Optional preview/excerpt from the source
         */
        excerpt?: string;
    }>;

    /**
     * Optional structured progress-card payload shown while a response is still in progress.
     */
    readonly progressCard?: ChatProgressCard;

    /**
     * Optional list of tools that were available to the model when generating this message.
     *
     * This field is populated by the server from the exact tool definitions passed to the LLM
     * request so developers can inspect what capabilities the model had access to during
     * each conversation turn.
     */
    readonly availableTools?: ReadonlyArray<LlmToolDefinition>;

    /**
     * Optional prompt snapshot from which this message was generated.
     *
     * Intended for advanced/raw inspection so developers can see the exact chat prompt,
     * resolved parameters, tool availability, and provider payload associated with one turn.
     */
    readonly prompt?: ChatMessagePrompt;
};

/**
 * TODO: Make all fields readonly
 * TODO: Delete `expectedAnswer` from ChatMessage
 * TODO: Rename `date` into `created`+`modified`
 */
