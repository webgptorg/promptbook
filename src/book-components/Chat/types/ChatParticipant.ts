import type { AvatarDefinition } from '../../../avatars/types/AvatarDefinition';
import type { AvatarVisualId } from '../../../avatars/types/AvatarVisualDefinition';
import type { string_book } from '../../../book-2.0/agent-source/string_book';
import type { string_color, string_person_fullname } from '../../../types/string_person_fullname';
import type { id } from '../../../types/string_token';
import type { string_url_image } from '../../../types/string_url_image';
import { Color } from '../../../utils/color/Color';

/**
 * A participant in the chat
 *
 * @public exported from `@promptbook/components`
 */
export type ChatParticipant = {
    /**
     * Identifies the participant by their name, same as `message.from`
     */
    name: id;

    /**
     * Full name of the participant
     */
    fullname?: string_person_fullname;

    /**
     * Am I the participant? (i.e. is this the user)
     */
    isMe?: boolean;

    /**
     * Profile picture
     */
    avatarSrc?: string_url_image;

    /**
     * Deterministic avatar definition used when no static image should be shown.
     */
    avatarDefinition?: AvatarDefinition;

    /**
     * Built-in avatar visual id used with `avatarDefinition`.
     */
    avatarVisualId?: AvatarVisualId;

    /**
     * Color associated with the participant
     */
    color?: string_color | Color;
    //                     <- TODO: [🥻] Here should be just interface of the Color not the class itself

    /**
     * Agent source for avatar profile
     */
    agentSource?: string_book;

    /**
     * Knowledge sources (documents, URLs) used by the agent
     * Used for resolving document citations when the agent references sources
     */
    knowledgeSources?: Array<{ url: string; filename: string }>;
};

// TODO: [🕛] Unite `AgentBasicInformation`, `ChatParticipant`, `LlmExecutionTools` +  `LlmToolsMetadata`
