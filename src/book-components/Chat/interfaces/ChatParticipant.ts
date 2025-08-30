import type { string_name } from '../../../types/typeAliases';
import type { string_url_image } from '../../../types/typeAliases';

/**
 * A participant in the chat
 *
 * @public exported from `@promptbook/components`
 */
export type ChatParticipant = {
    name: string_name;
    avatarUrl?: string_url_image;
    color: string /*_color */;
};
