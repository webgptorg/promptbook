import type { string_markdown } from '../types/typeAliases';
import type { string_name } from '../types/typeAliases';
import type { string_uuid } from '../types/typeAliases';

/**
 * Represents a single message in a chat thread
 *
 * Note: [🚉] This is fully serializable as JSON
 */
export type ChatThreadMessage = {
    /**
     * Unique identifier for this message
     */
    readonly id: string_uuid;

    /**
     * Role of the message sender
     */
    readonly role: 'system' | 'user' | 'assistant';

    /**
     * Name of the participant (for display purposes)
     */
    readonly name?: string_name;

    /**
     * Content of the message
     */
    readonly content: string_markdown;

    /**
     * Timestamp when the message was created
     */
    readonly timestamp: Date;
};

/**
 * Represents a conversation thread containing multiple messages
 *
 * Note: [🚉] This is fully serializable as JSON
 */
export type ChatThread = {
    /**
     * Unique identifier for this thread
     */
    readonly id: string_uuid;

    /**
     * Title of the thread (optional)
     */
    readonly title?: string;

    /**
     * Messages in chronological order
     */
    readonly messages: ReadonlyArray<ChatThreadMessage>;

    /**
     * Timestamp when the thread was created
     */
    readonly createdAt: Date;

    /**
     * Timestamp when the thread was last updated
     */
    readonly updatedAt: Date;
};

/**
 * Options for creating a new chat thread
 */
export type CreateChatThreadOptions = {
    /**
     * Optional title for the thread
     */
    title?: string;

    /**
     * Initial system message (optional)
     */
    systemMessage?: string_markdown;
};

/**
 * Options for adding a message to a chat thread
 */
export type AddMessageToChatThreadOptions = {
    /**
     * Role of the message sender
     */
    role: 'system' | 'user' | 'assistant';

    /**
     * Name of the participant (for display purposes)
     */
    name?: string_name;

    /**
     * Content of the message
     */
    content: string_markdown;
};
