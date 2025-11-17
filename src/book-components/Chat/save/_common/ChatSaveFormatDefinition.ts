import type { Promisable } from 'type-fest';
import type { string_file_extension, string_mime_type } from '../../../../types/typeAliases';
import type { ChatMessage } from '../../types/ChatMessage';
import type { ChatParticipant } from '../../types/ChatParticipant';

/**
 * Plugin contract for chat export formatNames
 *
 * @public exported from `@promptbook/components`
 */
export type ChatSaveFormatDefinition = {
    /**
     * A unique name for the format (e.g. 'json', 'txt', 'md', 'html', 'pdf', etc.)
     */
    readonly formatName: string_file_extension | string_mime_type | string;

    /**
     * A human-readable label for the format (e.g. 'JSON', 'Plain Text', 'Markdown', 'HTML', 'PDF', etc.) shown in UI
     */
    readonly label: string;

    /**
     * MIME type (e.g. 'application/json', 'text/plain', 'text/markdown', 'text/html', 'application/pdf', etc.)
     */
    readonly mimeType: string;

    /**
     * File extension without leading dot (e.g. 'json', 'txt', 'md', 'html', 'pdf', etc.)
     */
    readonly fileExtension: string;

    /**
     * The function that generates the content of the file to be saved
     */
    getContent(chatExportData: ChatExportData): Promisable<string>;
};

/**
 * Plugin contract for the data passed to `ChatSaveFormatDefinition.getContent()`
 *
 * @public exported from `@promptbook/components`
 */
type ChatExportData = {
    /**
     * The title of the chat (used for file naming, etc.)
     */
    readonly title: string;

    /**
     * The chat messages to be exported
     */
    readonly messages: ReadonlyArray<ChatMessage>;

    /**
     * The participants in the chat
     */
    readonly participants: ReadonlyArray<ChatParticipant>;
};
