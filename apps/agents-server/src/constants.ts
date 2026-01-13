/**
 * Common constants for the Agents Server
 */

/**
 * Common time intervals in milliseconds
 */
export const TIME_INTERVALS = {
    /**
     * One second in milliseconds
     */
    SECOND: 1000,

    /**
     * Two seconds in milliseconds
     */
    TWO_SECONDS: 2000,

    /**
     * Three seconds in milliseconds
     */
    THREE_SECONDS: 3000,

    /**
     * Five seconds in milliseconds
     */
    FIVE_SECONDS: 5000,

    /**
     * Thirty seconds in milliseconds
     */
    THIRTY_SECONDS: 30000,

    /**
     * One minute in milliseconds
     */
    MINUTE: 60000,
} as const;

/**
 * HTTP Status Codes
 */
export const HTTP_STATUS_CODES = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * UI and Layout constants
 */
export const UI_CONSTANTS = {
    /**
     * Breakpoint for mobile devices in pixels
     */
    MOBILE_BREAKPOINT: 768,
} as const;
