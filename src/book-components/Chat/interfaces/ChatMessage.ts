import type { string_markdown } from '../../../types/typeAliases';
import type { string_name } from '../../../types/typeAliases';

/**
 * A message in the chat
 *
 * @public exported from `@promptbook/components`
 */
export type ChatMessage = {
    id: string;
    date: Date /* <- TODO: Rename+split into created+modified */;
    from: string_name;
    content: string_markdown;
    isComplete?: boolean;
    expectedAnswer?: string;
    isVoiceCall?: boolean;
};
