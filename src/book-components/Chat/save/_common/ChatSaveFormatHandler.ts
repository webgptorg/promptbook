import type { Promisable } from 'type-fest';
import type { ChatMessage } from '../../types/ChatMessage';
import type { ChatParticipant } from '../../types/ChatParticipant';
import type { string_chat_format_name } from './string_chat_format_name';

/**
 * Serializable chat payload exposed to custom save-format handlers.
 *
 * @private Internal helper for chat save integrations.
 */
export type ChatSaveFormatHandlerOptions = {
    /**
     * Exported chat title used by downstream filename or document generation.
     */
    readonly title: string;

    /**
     * Messages included in the export.
     */
    readonly messages: ReadonlyArray<ChatMessage>;

    /**
     * Participant metadata included in the export.
     */
    readonly participants: ReadonlyArray<ChatParticipant>;
};

/**
 * Custom handler used to override one chat save format.
 *
 * @private Internal helper for chat save integrations.
 */
export type ChatSaveFormatHandler = (options: ChatSaveFormatHandlerOptions) => Promisable<void>;

/**
 * Optional map of chat save formats handled by the host application.
 *
 * @private Internal helper for chat save integrations.
 */
export type ChatSaveFormatHandlerMap = Partial<Record<string_chat_format_name, ChatSaveFormatHandler>>;
