import { resolveFeedbackThreadMessages } from './resolveFeedbackThreadMessages';
import { normalizeOptionalText, resolveSerializableArray } from './serverBackupRowUtilities';
import type { BackupAgentPreview, BackupUserPreview, ChatFeedbackRow, UserChatRow } from './serverBackupTypes';

/**
 * Attachment reference stored alongside exported files/media metadata.
 *
 * @private type of `createServerBackupZipStream`
 */
export type BackupAttachmentReference = {
    readonly source: 'user-chat' | 'chat-feedback';
    readonly messageIndex: number;
    readonly messageId: string | null;
    readonly attachmentName: string | null;
    readonly sender: unknown;
    readonly chatId?: string;
    readonly chatTitle?: string | null;
    readonly feedbackId?: number;
    readonly user?: BackupUserPreview | null;
    readonly agent?: BackupAgentPreview | null;
};

/**
 * Builds one map of attachment URLs to the user-facing messages that reference them.
 *
 * @param options - Attachment map source data.
 * @returns Attachment references keyed by URL.
 *
 * @private function of `createServerBackupZipStream`
 */
export function createAttachmentReferencesByUrl(options: {
    userChats: ReadonlyArray<UserChatRow>;
    feedbackRows: ReadonlyArray<ChatFeedbackRow>;
    userPreviewById: ReadonlyMap<number, BackupUserPreview>;
    agentPreviewByPermanentId: ReadonlyMap<string, BackupAgentPreview>;
    agentPreviewByName: ReadonlyMap<string, BackupAgentPreview>;
}): Map<string, Array<BackupAttachmentReference>> {
    const attachmentReferencesByUrl = new Map<string, Array<BackupAttachmentReference>>();

    const appendReference = (url: string, reference: BackupAttachmentReference): void => {
        const references = attachmentReferencesByUrl.get(url) || [];
        references.push(reference);
        attachmentReferencesByUrl.set(url, references);
    };

    for (const chat of options.userChats) {
        const userPreview = options.userPreviewById.get(chat.userId) || null;
        const agentPreview = options.agentPreviewByPermanentId.get(chat.agentPermanentId) || null;

        for (const [messageIndex, message] of resolveSerializableArray(chat.messages).entries()) {
            for (const attachment of resolveMessageAttachments(message)) {
                appendReference(attachment.url, {
                    source: 'user-chat',
                    chatId: chat.id,
                    chatTitle: chat.title,
                    messageIndex,
                    messageId: normalizeOptionalText((message as { id?: unknown }).id),
                    attachmentName: attachment.name,
                    sender: (message as { sender?: unknown }).sender ?? null,
                    user: userPreview,
                    agent: agentPreview,
                });
            }
        }
    }

    for (const feedbackRow of options.feedbackRows) {
        const agentPreview = options.agentPreviewByName.get(feedbackRow.agentName) || null;
        const { messages } = resolveFeedbackThreadMessages(feedbackRow.chatThread);

        for (const [messageIndex, message] of messages.entries()) {
            for (const attachment of resolveMessageAttachments(message)) {
                appendReference(attachment.url, {
                    source: 'chat-feedback',
                    feedbackId: feedbackRow.id,
                    messageIndex,
                    messageId: normalizeOptionalText((message as { id?: unknown }).id),
                    attachmentName: attachment.name,
                    sender: (message as { sender?: unknown }).sender ?? null,
                    agent: agentPreview,
                });
            }
        }
    }

    return attachmentReferencesByUrl;
}

/**
 * Resolves attachment references for the provided URLs.
 *
 * @param attachmentReferencesByUrl - Attachment reference map keyed by URL.
 * @param candidateUrls - Possible URLs for one backed-up file.
 * @returns Flattened reference list.
 *
 * @private function of `createServerBackupZipStream`
 */
export function resolveAttachmentReferencesForUrls(
    attachmentReferencesByUrl: ReadonlyMap<string, ReadonlyArray<BackupAttachmentReference>>,
    candidateUrls: ReadonlyArray<string | null>,
): Array<BackupAttachmentReference> {
    const references: Array<BackupAttachmentReference> = [];

    for (const candidateUrl of candidateUrls) {
        const normalizedUrl = normalizeOptionalText(candidateUrl);
        if (!normalizedUrl) {
            continue;
        }

        const matches = attachmentReferencesByUrl.get(normalizedUrl) || [];
        references.push(...matches);
    }

    return references;
}

/**
 * Extracts normalized attachment previews from one serialized chat message.
 *
 * @param message - One serialized chat message candidate.
 * @returns Normalized attachment previews with required URLs.
 *
 * @private function of `createServerBackupZipStream`
 */
function resolveMessageAttachments(message: Record<string, unknown>): Array<{
    name: string | null;
    url: string;
}> {
    const rawAttachments = message.attachments;
    if (!Array.isArray(rawAttachments)) {
        return [];
    }

    return rawAttachments.flatMap((attachment) => {
        if (!attachment || typeof attachment !== 'object' || Array.isArray(attachment)) {
            return [];
        }

        const url = normalizeOptionalText((attachment as { url?: unknown }).url);
        if (!url) {
            return [];
        }

        return [
            {
                name: normalizeOptionalText((attachment as { name?: unknown }).name),
                url,
            },
        ];
    });
}
