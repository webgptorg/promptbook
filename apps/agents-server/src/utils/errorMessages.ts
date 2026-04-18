/**
 * Centralized error message mapping utility for user-friendly error messages
 *
 * This utility provides:
 * - User-friendly error messages for common error scenarios
 * - Console logging of raw errors for debugging
 * - DRY principle by centralizing error message logic
 */

export type ErrorCategory =
    | 'NETWORK_ERROR'
    | 'AUTHENTICATION_ERROR'
    | 'AGENT_NOT_FOUND'
    | 'AGENT_DELETED'
    | 'VALIDATION_ERROR'
    | 'RATE_LIMIT_ERROR'
    | 'SERVER_ERROR'
    | 'TIMEOUT_ERROR'
    | 'UNKNOWN_ERROR';

/**
 * Message payload for friendly error.
 */
export type FriendlyErrorMessage = {
    title: string;
    message: string;
    category: ErrorCategory;
    canRetry: boolean;
};

/**
 * API error-type mappings returned by the server.
 */
const ERROR_CATEGORY_BY_API_TYPE: Readonly<Record<string, ErrorCategory>> = {
    agent_deleted: 'AGENT_DELETED',
    authentication_error: 'AUTHENTICATION_ERROR',
    invalid_request_error: 'VALIDATION_ERROR',
    server_error: 'SERVER_ERROR',
};

/**
 * Message fragments mapped to friendly error categories.
 */
const ERROR_CATEGORY_RULES_BY_MESSAGE: ReadonlyArray<{
    readonly category: ErrorCategory;
    readonly fragments: ReadonlyArray<string>;
}> = [
    { category: 'AGENT_NOT_FOUND', fragments: ['not found'] },
    { category: 'NETWORK_ERROR', fragments: ['network', 'fetch'] },
    { category: 'TIMEOUT_ERROR', fragments: ['timeout', 'timed out'] },
    { category: 'RATE_LIMIT_ERROR', fragments: ['rate limit', 'too many requests'] },
    { category: 'AUTHENTICATION_ERROR', fragments: ['unauthorized', 'forbidden'] },
    { category: 'VALIDATION_ERROR', fragments: ['validation', 'invalid'] },
];

/**
 * Returns the error as a plain object when available.
 */
function getErrorRecord(rawError: unknown): Record<string, unknown> | null {
    if (typeof rawError !== 'object' || rawError === null) {
        return null;
    }

    return rawError as Record<string, unknown>;
}

/**
 * Returns the nested API error object when present.
 */
function getNestedErrorRecord(errorRecord: Record<string, unknown>): Record<string, unknown> | null {
    const nestedError = errorRecord.error;

    if (typeof nestedError !== 'object' || nestedError === null) {
        return null;
    }

    return nestedError as Record<string, unknown>;
}

/**
 * Returns a string value when the input is a string.
 */
function getStringValue(value: unknown): string | null {
    return typeof value === 'string' ? value : null;
}

/**
 * Returns a non-empty string while preserving the original value.
 */
function getNonEmptyStringValue(value: unknown): string | null {
    if (typeof value !== 'string' || value.trim() === '') {
        return null;
    }

    return value;
}

/**
 * Returns a numeric value when the input is a number.
 */
function getNumberValue(value: unknown): number | null {
    return typeof value === 'number' ? value : null;
}

/**
 * Attempts to extract one human-readable detail message from unknown errors.
 */
function extractErrorDetailMessage(rawError: unknown): string | null {
    if (!rawError) {
        return null;
    }

    if (rawError instanceof Error) {
        return rawError.message || null;
    }

    const errorRecord = getErrorRecord(rawError);

    if (!errorRecord) {
        return null;
    }

    const nestedErrorRecord = getNestedErrorRecord(errorRecord);
    const nestedMessage = nestedErrorRecord ? getNonEmptyStringValue(nestedErrorRecord.message) : null;

    return nestedMessage ?? getNonEmptyStringValue(errorRecord.message);
}

/**
 * Categorizes structured API errors that carry a nested `error.type`.
 */
function categorizeErrorByApiType(errorRecord: Record<string, unknown>): ErrorCategory | null {
    const nestedErrorRecord = getNestedErrorRecord(errorRecord);
    const errorType = nestedErrorRecord ? getStringValue(nestedErrorRecord.type) : null;

    return errorType ? ERROR_CATEGORY_BY_API_TYPE[errorType] || null : null;
}

/**
 * Categorizes native `Error` instances by matching their message fragments.
 */
function categorizeErrorByMessage(rawError: unknown): ErrorCategory | null {
    if (!(rawError instanceof Error)) {
        return null;
    }

    const normalizedMessage = rawError.message.toLowerCase();

    for (const errorRule of ERROR_CATEGORY_RULES_BY_MESSAGE) {
        if (errorRule.fragments.some((fragment) => normalizedMessage.includes(fragment))) {
            return errorRule.category;
        }
    }

    return null;
}

/**
 * Categorizes errors that expose an HTTP-like status code.
 */
function categorizeErrorByStatus(errorRecord: Record<string, unknown>): ErrorCategory | null {
    const status = getNumberValue(errorRecord.status);

    if (status === null) {
        return null;
    }

    if (status === 404) {
        return 'AGENT_NOT_FOUND';
    }
    if (status === 401 || status === 403) {
        return 'AUTHENTICATION_ERROR';
    }
    if (status === 410) {
        return 'AGENT_DELETED';
    }
    if (status === 429) {
        return 'RATE_LIMIT_ERROR';
    }
    if (status >= 500) {
        return 'SERVER_ERROR';
    }
    if (status >= 400) {
        return 'VALIDATION_ERROR';
    }

    return null;
}

/**
 * Categorizes an error using the same precedence as before:
 * structured API types, then native error messages, then HTTP status codes.
 */
export function categorizeError(error: unknown): ErrorCategory {
    if (!error) {
        return 'UNKNOWN_ERROR';
    }

    const errorRecord = getErrorRecord(error);

    if (!errorRecord) {
        return 'UNKNOWN_ERROR';
    }

    return (
        categorizeErrorByApiType(errorRecord) ??
        categorizeErrorByMessage(error) ??
        categorizeErrorByStatus(errorRecord) ??
        'UNKNOWN_ERROR'
    );
}

/**
 * Creates one user-facing error payload.
 */
function createFriendlyErrorMessage(
    category: ErrorCategory,
    title: string,
    message: string,
    canRetry: boolean,
): FriendlyErrorMessage {
    return {
        title,
        message,
        category,
        canRetry,
    };
}

/**
 * Builds the validation-error message, preserving any extracted server detail.
 */
function createValidationFriendlyErrorMessage(category: ErrorCategory, rawError?: unknown): FriendlyErrorMessage {
    const detailMessage = extractErrorDetailMessage(rawError);

    return createFriendlyErrorMessage(
        category,
        'Invalid Request',
        detailMessage ||
            'There was an issue with your message. Please try rephrasing it or check if any attachments are valid.',
        true,
    );
}

/**
 * Builds the fallback message for uncategorized failures.
 */
function createUnknownFriendlyErrorMessage(category: ErrorCategory, rawError?: unknown): FriendlyErrorMessage {
    const errorDetail = extractErrorDetailMessage(rawError);
    const detailMessage = errorDetail
        ? `An unexpected error occurred: ${errorDetail}`
        : 'An unexpected error occurred. Please try again.';

    return createFriendlyErrorMessage(category, 'Unexpected Error', detailMessage, true);
}

/**
 * Get a user-friendly error message based on the error category
 */
export function getFriendlyErrorMessage(category: ErrorCategory, rawError?: unknown): FriendlyErrorMessage {
    switch (category) {
        case 'NETWORK_ERROR':
            return createFriendlyErrorMessage(
                category,
                'Connection Issue',
                'Unable to connect to the agent server. Please check your internet connection and try again.',
                true,
            );

        case 'AUTHENTICATION_ERROR':
            return createFriendlyErrorMessage(
                category,
                'Authentication Failed',
                'Your session may have expired. Please refresh the page and try again.',
                false,
            );

        case 'AGENT_NOT_FOUND':
            return createFriendlyErrorMessage(
                category,
                'Agent Not Found',
                'The agent you are trying to chat with could not be found. It may have been deleted or renamed.',
                false,
            );

        case 'AGENT_DELETED':
            return createFriendlyErrorMessage(
                category,
                'Agent Deleted',
                'This agent has been deleted. You can restore it from the Recycle Bin.',
                false,
            );

        case 'VALIDATION_ERROR':
            return createValidationFriendlyErrorMessage(category, rawError);

        case 'RATE_LIMIT_ERROR':
            return createFriendlyErrorMessage(
                category,
                'Too Many Requests',
                'You have sent too many messages in a short period. Please wait a moment and try again.',
                true,
            );

        case 'SERVER_ERROR':
            return createFriendlyErrorMessage(
                category,
                'Server Error',
                'The agent server encountered an error while processing your request. Please try again in a moment.',
                true,
            );

        case 'TIMEOUT_ERROR':
            return createFriendlyErrorMessage(
                category,
                'Request Timeout',
                'Your request took too long to process. The agent may be busy or the server may be overloaded. Please try again.',
                true,
            );

        case 'UNKNOWN_ERROR':
        default: {
            return createUnknownFriendlyErrorMessage(category, rawError);
        }
    }
}

/**
 * Handle an error by logging it and returning a user-friendly message
 *
 * This is the main entry point for error handling in the agent server chat.
 * It follows the DRY principle by centralizing error processing logic.
 *
 * @param error - The raw error object
 * @param context - Optional context for logging (e.g., "AgentChat", "API Route")
 * @returns A user-friendly error message object
 */
export function handleChatError(error: unknown, context?: string): FriendlyErrorMessage {
    // Log the raw error to console for debugging
    const logPrefix = context ? `[${context}]` : '[Chat Error]';
    console.error(`${logPrefix} Raw error:`, error);

    // Categorize the error
    const category = categorizeError(error);

    // Get user-friendly message
    const friendlyMessage = getFriendlyErrorMessage(category, error);

    // Log the categorized error type for easier debugging
    console.error(`${logPrefix} Error category: ${category}`);

    return friendlyMessage;
}
