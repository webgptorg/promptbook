import spaceTrim from 'spacetrim';

/**
 * Default chat prompt used when the incoming message is missing or blank.
 */
export const DEFAULT_CHAT_MESSAGE_CONTENT = 'Tell me more about yourself.';

/**
 * Maximum number of characters accepted in a single user chat message.
 */
export const MAX_CHAT_MESSAGE_CHARACTERS = 20_000;

/**
 * Stable codes describing one chat message validation failure.
 */
export type ChatMessageValidationIssueCode = 'CHAT_MESSAGE_INVALID_TYPE' | 'CHAT_MESSAGE_TOO_LONG';

/**
 * Structured validation issue returned when incoming chat message is rejected.
 */
export type ChatMessageValidationIssue = {
    /**
     * Stable issue code for branching and telemetry.
     */
    readonly code: ChatMessageValidationIssueCode;
    /**
     * User-facing explanation of the validation problem.
     */
    readonly message: string;
    /**
     * Suggested HTTP status code for API responses.
     */
    readonly status: 400 | 413;
};

/**
 * Result returned by chat message validation helpers.
 */
export type ChatMessageValidationResult =
    | {
          readonly isValid: true;
          readonly message: string;
      }
    | {
          readonly isValid: false;
          readonly issue: ChatMessageValidationIssue;
      };

/**
 * Optional settings used when resolving message content for chat API requests.
 */
type ResolveChatMessageForApiRequestOptions = {
    /**
     * Fallback message used when request message is missing or blank.
     */
    readonly fallbackMessage?: string;
};

/**
 * Creates a validation issue for payloads where message has invalid type.
 */
function createInvalidTypeIssue(): ChatMessageValidationIssue {
    return {
        code: 'CHAT_MESSAGE_INVALID_TYPE',
        message: 'Message must be a string.',
        status: 400,
    };
}

/**
 * Creates a validation issue for payloads that exceed the maximum message size.
 */
function createTooLongIssue(messageLength: number): ChatMessageValidationIssue {
    return {
        code: 'CHAT_MESSAGE_TOO_LONG',
        message: `Message is too long. Maximum length is ${MAX_CHAT_MESSAGE_CHARACTERS.toLocaleString()} characters (received ${messageLength.toLocaleString()}).`,
        status: 413,
    };
}

/**
 * Validates one provided chat message value.
 *
 * This helper is strict and does not apply fallback values.
 */
export function resolveChatMessageValidationIssue(rawMessage: unknown): ChatMessageValidationIssue | null {
    if (typeof rawMessage !== 'string') {
        return createInvalidTypeIssue();
    }

    if (rawMessage.length > MAX_CHAT_MESSAGE_CHARACTERS) {
        return createTooLongIssue(rawMessage.length);
    }

    return null;
}

/**
 * Resolves incoming chat API message into safe content with fallback behavior.
 */
export function resolveChatMessageContentForApiRequest(
    rawMessage: unknown,
    options: ResolveChatMessageForApiRequestOptions = {},
): ChatMessageValidationResult {
    const fallbackMessage = options.fallbackMessage || DEFAULT_CHAT_MESSAGE_CONTENT;

    if (rawMessage === undefined || rawMessage === null || (typeof rawMessage === 'string' && spaceTrim(rawMessage) === '')) {
        return {
            isValid: true,
            message: fallbackMessage,
        };
    }

    const issue = resolveChatMessageValidationIssue(rawMessage);
    if (issue) {
        return {
            isValid: false,
            issue,
        };
    }

    if (typeof rawMessage !== 'string') {
        return {
            isValid: false,
            issue: createInvalidTypeIssue(),
        };
    }

    return {
        isValid: true,
        message: rawMessage,
    };
}
