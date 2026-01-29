import { CHAT_SAVE_FORMATS } from '../index';

/**
 * Supported chat export formatNames
 * @public exported from `@promptbook/components`
 */
export type string_chat_format_name = (typeof CHAT_SAVE_FORMATS)[number]['formatName'];
