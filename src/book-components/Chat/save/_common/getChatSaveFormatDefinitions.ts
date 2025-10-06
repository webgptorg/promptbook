import { CHAT_SAVE_FORMATS } from '..';
import { ChatSaveFormatDefinition } from './ChatSaveFormatDefinition';
import { string_chat_format_name } from './string_chat_format_name';

/**
 * Returns enabled chat save plugins filtered by formatNames (or all when omitted)
 *
 * @public exported from `@promptbook/components`
 */
export function getChatSaveFormatDefinitions(
    formatNames?: ReadonlyArray<string_chat_format_name>,
): ReadonlyArray<ChatSaveFormatDefinition> {
    if (!formatNames) {
        return CHAT_SAVE_FORMATS;
    }
    return CHAT_SAVE_FORMATS.filter((saveFormatDefinition) => formatNames.includes(saveFormatDefinition.formatName));
}
