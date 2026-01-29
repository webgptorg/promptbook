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

export type FriendlyErrorMessage = {
    title: string;
    message: string;
    category: ErrorCategory;
    canRetry: boolean;
};

/**
 * Categorize an error based on its properties
 */
export function categorizeError(error: unknown): ErrorCategory {
    if (!error) {
        return 'UNKNOWN_ERROR';
    }

    // Check for error object with type property (from API responses)
    if (typeof error === 'object' && error !== null) {
        const errorObj = error as Record<string, unknown>;

        // Check for structured error response from API
        const nestedError = errorObj.error;
        if (
            nestedError &&
            typeof nestedError === 'object' &&
            'type' in nestedError &&
            typeof nestedError.type === 'string'
        ) {
            const errorType = nestedError.type;

            if (errorType === 'agent_deleted') {
                return 'AGENT_DELETED';
            }
            if (errorType === 'authentication_error') {
                return 'AUTHENTICATION_ERROR';
            }
            if (errorType === 'invalid_request_error') {
                return 'VALIDATION_ERROR';
            }
            if (errorType === 'server_error') {
                return 'SERVER_ERROR';
            }
        }

        // Check Error instance message patterns
        if (error instanceof Error) {
            const message = error.message.toLowerCase();

            if (message.includes('not found')) {
                return 'AGENT_NOT_FOUND';
            }
            if (message.includes('network') || message.includes('fetch')) {
                return 'NETWORK_ERROR';
            }
            if (message.includes('timeout') || message.includes('timed out')) {
                return 'TIMEOUT_ERROR';
            }
            if (message.includes('rate limit') || message.includes('too many requests')) {
                return 'RATE_LIMIT_ERROR';
            }
            if (message.includes('unauthorized') || message.includes('forbidden')) {
                return 'AUTHENTICATION_ERROR';
            }
            if (message.includes('validation') || message.includes('invalid')) {
                return 'VALIDATION_ERROR';
            }
        }

        // Check HTTP status codes
        if ('status' in errorObj && typeof errorObj.status === 'number') {
            const status = errorObj.status;

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
        }
    }

    return 'UNKNOWN_ERROR';
}

/**
 * Get a user-friendly error message based on the error category
 */
export function getFriendlyErrorMessage(category: ErrorCategory, rawError?: unknown): FriendlyErrorMessage {
    switch (category) {
        case 'NETWORK_ERROR':
            return {
                title: 'Connection Issue',
                message: 'Unable to connect to the agent server. Please check your internet connection and try again.',
                category,
                canRetry: true,
            };

        case 'AUTHENTICATION_ERROR':
            return {
                title: 'Authentication Failed',
                message: 'Your session may have expired. Please refresh the page and try again.',
                category,
                canRetry: false,
            };

        case 'AGENT_NOT_FOUND':
            return {
                title: 'Agent Not Found',
                message:
                    'The agent you are trying to chat with could not be found. It may have been deleted or renamed.',
                category,
                canRetry: false,
            };

        case 'AGENT_DELETED':
            return {
                title: 'Agent Deleted',
                message: 'This agent has been deleted. You can restore it from the Recycle Bin.',
                category,
                canRetry: false,
            };

        case 'VALIDATION_ERROR':
            return {
                title: 'Invalid Request',
                message:
                    'There was an issue with your message. Please try rephrasing it or check if any attachments are valid.',
                category,
                canRetry: true,
            };

        case 'RATE_LIMIT_ERROR':
            return {
                title: 'Too Many Requests',
                message: 'You have sent too many messages in a short period. Please wait a moment and try again.',
                category,
                canRetry: true,
            };

        case 'SERVER_ERROR':
            return {
                title: 'Server Error',
                message:
                    'The agent server encountered an error while processing your request. Please try again in a moment.',
                category,
                canRetry: true,
            };

        case 'TIMEOUT_ERROR':
            return {
                title: 'Request Timeout',
                message:
                    'Your request took too long to process. The agent may be busy or the server may be overloaded. Please try again.',
                category,
                canRetry: true,
            };

        case 'UNKNOWN_ERROR':
        default: {
            // Try to extract a meaningful message from the raw error
            let detailMessage = 'An unexpected error occurred. Please try again.';

            if (rawError) {
                if (rawError instanceof Error && rawError.message) {
                    detailMessage = `An unexpected error occurred: ${rawError.message}`;
                } else if (typeof rawError === 'object' && rawError !== null) {
                    const errorObj = rawError as Record<string, unknown>;
                    const nestedError = errorObj.error;
                    if (
                        nestedError &&
                        typeof nestedError === 'object' &&
                        'message' in nestedError &&
                        typeof nestedError.message === 'string'
                    ) {
                        detailMessage = `An unexpected error occurred: ${nestedError.message}`;
                    } else if ('message' in errorObj && typeof errorObj.message === 'string') {
                        detailMessage = `An unexpected error occurred: ${errorObj.message}`;
                    }
                }
            }

            return {
                title: 'Unexpected Error',
                message: detailMessage,
                category,
                canRetry: true,
            };
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
