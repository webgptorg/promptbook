/**
 * Connection progress utilities for better user experience during authentication
 */

/**
 * Connection status types for better progress indication
 *
 * @private
 */
export type ConnectionStatus = 'connecting' | 'authenticating' | 'connected' | 'disconnected' | 'error' | 'timeout';

/**
 * Progress callback function type for connection status updates
 *
 * @private
 */
export type ConnectionProgressCallback = (status: ConnectionStatus, message?: string) => void;

/**
 * Enhanced connection options with progress reporting
 *
 * @private
 */
export interface ConnectionProgressOptions {
    onProgress?: ConnectionProgressCallback;
    enableProgressReporting?: boolean;
}

/**
 * Default progress messages for different connection states
 *
 * @private
 */
export const DEFAULT_PROGRESS_MESSAGES = {
    connecting: 'Connecting to Promptbook server...',
    authenticating: 'Authenticating with social provider (Facebook, Google, etc.)...',
    connected: 'Successfully connected to Promptbook server',
    disconnected: 'Disconnected from Promptbook server',
    error: 'Connection failed',
    timeout: 'Connection timed out - this may happen during social login flows',
} as const;

/**
 * Creates a progress reporter for connection status
 * This can be used by frontend applications to show connection progress
 *
 * @private
 */
export function createConnectionProgressReporter(callback?: ConnectionProgressCallback): ConnectionProgressCallback {
    return (status: ConnectionStatus, message?: string) => {
        const progressMessage = message || DEFAULT_PROGRESS_MESSAGES[status];

        // Log progress for debugging
        if (typeof console !== 'undefined') {
            const emoji = {
                connecting: '🔄',
                authenticating: '🔐',
                connected: '✅',
                disconnected: '📡',
                error: '❌',
                timeout: '⏰',
            }[status];

            console.info(`${emoji} ${progressMessage}`);
        }

        // Call custom callback if provided
        if (callback) {
            callback(status, progressMessage);
        }
    };
}

/**
 * Timeout constants with descriptions for different connection types
 *
 * @private
 */
export const CONNECTION_TIMEOUTS = {
    /** Standard timeout for regular connections */
    STANDARD: 30 * 1000, // 30 seconds

    /** Extended timeout for OAuth flows that require user interaction */
    OAUTH: 60 * 1000, // 60 seconds

    /** Short timeout for quick health checks */
    HEALTH_CHECK: 10 * 1000, // 10 seconds
} as const;

/**
 * Helper function to get appropriate timeout based on connection type
 *
 * @private
 */
export function getConnectionTimeout(type: 'standard' | 'oauth' | 'health_check'): number {
    switch (type) {
        case 'oauth':
            return CONNECTION_TIMEOUTS.OAUTH;
        case 'health_check':
            return CONNECTION_TIMEOUTS.HEALTH_CHECK;
        case 'standard':
        default:
            return CONNECTION_TIMEOUTS.STANDARD;
    }
}

/**
 * Creates a timeout wrapper with progress reporting
 *
 * @private
 */
export function createTimeoutWithProgress(timeoutMs: number, onProgress?: ConnectionProgressCallback): Promise<never> {
    return new Promise((_, reject) => {
        /*const timeoutId = */ setTimeout(() => {
            if (onProgress) {
                onProgress('timeout', `Connection timed out after ${timeoutMs / 1000} seconds`);
            }
            reject(
                new Error(
                    `Connection timeout after ${timeoutMs / 1000} seconds. ` +
                        `This may happen during social authentication flows like Facebook login. ` +
                        `Please ensure stable network connection and complete authentication promptly.`,
                ),
            );
        }, timeoutMs);

        // This promise never resolves, only rejects on timeout
        // It's meant to be used with Promise.race()
    });
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
