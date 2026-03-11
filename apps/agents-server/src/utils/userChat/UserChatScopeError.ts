/**
 * Error code returned when a user-chat persistence operation fails due to scope mismatch.
 */
export type UserChatScopeErrorCode =
    | 'USER_CHAT_NOT_FOUND'
    | 'USER_CHAT_SCOPE_AGENT_MISMATCH'
    | 'USER_CHAT_SCOPE_USER_MISMATCH'
    | 'USER_CHAT_SCOPE_INCONSISTENT'
    | 'USER_CHAT_SCOPE_DIAGNOSTICS_FAILED';

/**
 * Structured debug details attached to user-chat scope errors.
 */
export type UserChatScopeErrorDetails = {
    operation: 'update_messages' | 'update_draft' | 'mutate_chat';
    requestedScope: {
        userId: number;
        agentPermanentId: string;
        chatId: string;
    };
    locatedScope: {
        userId: number;
        agentPermanentId: string;
        chatId: string;
    } | null;
    likelyCause: string;
    databaseErrorMessage?: string;
};

/**
 * Branded error thrown when one `UserChat` row is missing from current scope.
 */
export class UserChatScopeError extends Error {
    /**
     * Structured classification code for API handlers and clients.
     */
    public readonly code: UserChatScopeErrorCode;

    /**
     * Structured diagnostics to simplify debugging from UI notifications.
     */
    public readonly details: UserChatScopeErrorDetails;

    /**
     * Creates one scope error with stable code and diagnostics payload.
     */
    public constructor(code: UserChatScopeErrorCode, message: string, details: UserChatScopeErrorDetails) {
        super(message);
        this.name = 'UserChatScopeError';
        this.code = code;
        this.details = details;
    }
}
