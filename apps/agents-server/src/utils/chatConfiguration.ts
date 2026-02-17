import { getMetadataMap } from '../database/getMetadata';

const CHAT_FAIL_MESSAGE_KEY = 'CHAT_FAIL_MESSAGE';
const IS_FILE_ATTACHEMENTS_ENABLED_KEY = 'IS_FILE_ATTACHEMENTS_ENABLED';

/**
 * Normalizes boolean metadata values, accepting only explicit `true`/`false` strings.
 *
 * @param raw - The metadata value read from the database.
 * @param fallback - The default value when the metadata is missing or malformed.
 * @returns The normalized boolean flag.
 * @private Internal helper used by chat metadata loaders.
 */
function parseBooleanMetadata(raw: string | null, fallback: boolean): boolean {
    if (raw === 'true') {
        return true;
    }

    if (raw === 'false') {
        return false;
    }

    return fallback;
}

/**
 * Metadata values consumed by the Agents Server chat pages.
 *
 * @private Internal helper type used inside `loadChatConfiguration`.
 */
export type ChatConfiguration = {
    /** Optional friendly copy displayed inside the chat failure banner. */
    readonly chatFailMessage: string | null;
    /** Whether file attachments are allowed inside chats. */
    readonly isFileAttachmentsEnabled: boolean;
};

/**
 * Loads the shared chat metadata configuration from the database.
 *
 * @returns The chat metadata values for the current Agents Server instance.
 * @private Internal helper for the `apps/agents-server` chat routes.
 */
export async function loadChatConfiguration(): Promise<ChatConfiguration> {
    const metadata = await getMetadataMap([CHAT_FAIL_MESSAGE_KEY, IS_FILE_ATTACHEMENTS_ENABLED_KEY]);
    const rawChatFail = metadata[CHAT_FAIL_MESSAGE_KEY];
    const rawAttachments = metadata[IS_FILE_ATTACHEMENTS_ENABLED_KEY];

    return {
        chatFailMessage: rawChatFail ?? null,
        isFileAttachmentsEnabled: parseBooleanMetadata(rawAttachments, true),
    };
}
