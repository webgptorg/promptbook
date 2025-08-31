import type { string_name, string_person_fullname, string_url_image } from '../../../types/typeAliases';

/**
 * A participant in the chat
 *
 * @public exported from `@promptbook/components`
 */
export type ChatParticipant = {
    /**
     * Identifies the participant by their name, same as `message.from`
     */
    name: string_name;

    /**
     * Full name of the participant
     */
    fullname: string_person_fullname;

    /**
     * Am I the participant? (i.e. is this the user)
     */
    isMe?: boolean;

    /**
     * Profile picture
     */
    avatarSrc?: string_url_image;

    /**
     * Color associated with the participant
     */
    color: string /*_color */;
};
