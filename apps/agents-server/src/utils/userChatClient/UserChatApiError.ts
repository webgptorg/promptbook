'use client';

/**
 * Error thrown for failed user-chat API requests with status/code/details metadata.
 *
 * @private shared helper for the Agents Server browser client
 */
export class UserChatApiError extends Error {
    /**
     * HTTP status returned by the API endpoint.
     */
    public readonly status: number;

    /**
     * Optional machine-readable API code.
     */
    public readonly code: string | null;

    /**
     * Optional structured API details payload.
     */
    public readonly details: unknown;

    /**
     * API URL that produced the error response.
     */
    public readonly url: string;

    /**
     * Creates one user-chat API error value.
     */
    public constructor(
        message: string,
        options: {
            status: number;
            code: string | null;
            details: unknown;
            url: string;
        },
    ) {
        super(message);
        this.name = 'UserChatApiError';
        this.status = options.status;
        this.code = options.code;
        this.details = options.details;
        this.url = options.url;
    }
}
