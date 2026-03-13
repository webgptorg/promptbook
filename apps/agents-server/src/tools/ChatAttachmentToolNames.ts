import type { string_javascript_name } from '../../../../src/_packages/types.index';

/**
 * Names of runtime tools used to inspect chat attachments in chunks.
 */
export const ChatAttachmentToolNames = {
    read: 'read_attached_file' as string_javascript_name,
    search: 'search_attached_file' as string_javascript_name,
} as const;
