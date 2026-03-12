/**
 * Attachment payload expected by chat routes and prompt formatting helpers.
 *
 * @public exported from `@promptbook/core`
 */
export type ChatAttachment = {
    readonly name: string;
    readonly type: string;
    readonly url: string;
};

/**
 * Resolved inline content of one chat attachment.
 *
 * @public exported from `@promptbook/core`
 */
export type ResolvedChatAttachmentContent = {
    readonly attachment: ChatAttachment;
    readonly content: string | null;
    readonly isTruncated: boolean;
    readonly reason: string | null;
    readonly encodingUsed: string | null;
    readonly encodingConfidence: number | null;
    readonly warnings: ReadonlyArray<string>;
    readonly wasBinary: boolean;
};

/**
 * Options for resolving chat attachment contents.
 *
 * @public exported from `@promptbook/core`
 */
export type ResolveChatAttachmentOptions = {
    /**
     * Whether to allow localhost URLs.
     *
     * @default false
     */
    readonly allowLocalhost?: boolean;

    /**
     * Forces text decoding even when the attachment looks binary.
     *
     * @default false
     */
    readonly forceText?: boolean;
};

export { normalizeChatAttachments } from './chatAttachments/normalizeChatAttachments';
export { formatChatAttachmentContext } from './chatAttachments/formatChatAttachmentContext';
export { resolveChatAttachmentContent } from './chatAttachments/resolveChatAttachmentContent';
export { resolveChatAttachmentContents } from './chatAttachments/resolveChatAttachmentContents';
export { formatChatAttachmentContentContext } from './chatAttachments/formatChatAttachmentContentContext';
export { appendChatAttachmentContext } from './chatAttachments/appendChatAttachmentContext';
export { appendChatAttachmentContextWithContent } from './chatAttachments/appendChatAttachmentContextWithContent';

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
