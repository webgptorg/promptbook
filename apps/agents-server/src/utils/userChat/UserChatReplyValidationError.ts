import { spaceTrim } from 'spacetrim';

/**
 * Stable error codes describing one invalid user-chat reply payload.
 */
export type UserChatReplyValidationErrorCode =
    | 'USER_CHAT_REPLY_FIELDS_INCOMPLETE'
    | 'USER_CHAT_REPLY_THREAD_MISMATCH'
    | 'USER_CHAT_REPLY_TARGET_NOT_FOUND'
    | 'USER_CHAT_REPLY_TARGET_INCOMPLETE'
    | 'USER_CHAT_REPLY_REFERENCE_INVALID'
    | 'USER_CHAT_REPLY_TARGET_AFTER_MESSAGE';

/**
 * Additional context persisted with reply-validation errors.
 */
export type UserChatReplyValidationErrorDetails = {
    chatId: string;
    repliedToMessageId?: string | null;
    replyThreadId?: string | null;
    messageId?: string | null;
};

/**
 * Branded validation error thrown when a user-chat reply relationship is invalid.
 */
export class UserChatReplyValidationError extends Error {
    public readonly code: UserChatReplyValidationErrorCode;
    public readonly details: UserChatReplyValidationErrorDetails;

    public constructor(
        code: UserChatReplyValidationErrorCode,
        details: UserChatReplyValidationErrorDetails,
        message: string,
    ) {
        super(spaceTrim(message));
        this.name = 'UserChatReplyValidationError';
        this.code = code;
        this.details = details;
    }
}
