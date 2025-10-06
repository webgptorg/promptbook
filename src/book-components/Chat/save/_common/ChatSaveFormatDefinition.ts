import { string_file_extension, string_mime_type } from '../../../../types/typeAliases';
import type { ChatMessage } from '../../types/ChatMessage';

/**
 * Plugin contract for chat export formatNames
 * @public exported from `@promptbook/components`
 */
export type ChatSaveFormatDefinition = {
    formatName: string_file_extension | string_mime_type | string;
    label: string;
    getContent: (messages: ChatMessage[]) => string;
    mimeType: string;
    fileExtension: string;
};
