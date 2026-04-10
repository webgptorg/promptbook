'use client';

import type { ChatMessage } from '@promptbook-local/types';

/**
 * Synthetic initial message id injected only on the client for empty transcripts.
 */
const SYNTHETIC_INITIAL_CANONICAL_MESSAGE_ID = 'canonical-agent-initial-message';

/**
 * Temporary optimistic id prefix used before a canonical user message arrives.
 */
const PENDING_OUTBOUND_MESSAGE_TEMP_ID_PREFIX = 'pending-outbound-user-message:';

/**
 * Returns `true` when one rendered message can be selected as a durable reply target.
 */
export function isReplyableCanonicalChatMessage(message: ChatMessage): boolean {
    return Boolean(
        typeof message.id === 'string' &&
            message.id.length > 0 &&
            message.id !== SYNTHETIC_INITIAL_CANONICAL_MESSAGE_ID &&
            !message.id.startsWith(PENDING_OUTBOUND_MESSAGE_TEMP_ID_PREFIX) &&
            message.isComplete !== false,
    );
}

/**
 * Creates the persisted reply snapshot embedded into a replying chat message.
 */
export function createReplyingToSnapshot(
    threadId: string,
    message: ChatMessage,
): NonNullable<ChatMessage['replyingTo']> {
    if (typeof message.id !== 'string' || message.id.length === 0) {
        throw new Error('Reply target message must have an id.');
    }

    const attachmentNames = (message.attachments || [])
        .map((attachment) => (typeof attachment?.name === 'string' ? attachment.name.trim() : ''))
        .filter(Boolean);

    return {
        threadId,
        messageId: message.id,
        sender: typeof message.sender === 'string' ? message.sender : String(message.sender),
        content: message.content,
        ...(attachmentNames.length > 0 ? { attachmentNames } : {}),
    };
}

/**
 * Serializes one optional reply snapshot into a stable signature string.
 */
export function serializeReplyingToSignature(replyingTo: ChatMessage['replyingTo']): string {
    return replyingTo ? JSON.stringify(replyingTo) : '';
}
