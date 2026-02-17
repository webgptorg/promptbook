/**
 * The structure that represents a resolved user location.
 *
 * @private internal helper of USE USER LOCATION commitment
 */
export type UserLocation = {
    /** Latitude in decimal degrees. */
    readonly latitude: number;

    /** Longitude in decimal degrees. */
    readonly longitude: number;

    /** Location accuracy radius in meters, if known. */
    readonly accuracy?: number;

    /** Altitude in meters, if available. */
    readonly altitude?: number | null;

    /** Altitude accuracy in meters, if available. */
    readonly altitudeAccuracy?: number | null;

    /** Heading in degrees relative to true north, if available. */
    readonly heading?: number | null;

    /** Movement speed in meters per second, if available. */
    readonly speed?: number | null;

    /** ISO 8601 timestamp when the location was captured. */
    readonly timestamp: string;
};

const DEFAULT_LOCATION_WAIT_TIMEOUT_MS = 60_000;

type PendingUserLocationRequest = {
    readonly resolve: (value: UserLocation) => void;
    readonly reject: (error: Error) => void;
    readonly timer: ReturnType<typeof setTimeout>;
};

const pendingUserLocationRequests = new Map<string, PendingUserLocationRequest>();

function cleanupUserLocationRequest(callId: string): PendingUserLocationRequest | undefined {
    const request = pendingUserLocationRequests.get(callId);
    if (request) {
        clearTimeout(request.timer);
        pendingUserLocationRequests.delete(callId);
    }
    return request;
}

/**
 * Waits for the browser to provide a location for the given tool call ID.
 *
 * @private internal helper of USE USER LOCATION commitment
 */
export function waitForUserLocation(
    callId: string,
    options: { timeoutMs?: number } = {},
): Promise<UserLocation> {
    const normalizedCallId = callId?.trim();
    if (!normalizedCallId) {
        throw new Error('callId is required to wait for user location');
    }

    if (pendingUserLocationRequests.has(normalizedCallId)) {
        throw new Error(Location request for callId  is already pending);
    }

    const timeoutMs = Math.max(1000, options.timeoutMs ?? DEFAULT_LOCATION_WAIT_TIMEOUT_MS);

    return new Promise<UserLocation>((resolve, reject) => {
        const timer = setTimeout(() => {
            const removed = cleanupUserLocationRequest(normalizedCallId);
            if (removed) {
                reject(new Error('Waiting for user location timed out'));
            }
        }, timeoutMs);

        pendingUserLocationRequests.set(normalizedCallId, {
            resolve: (value) => {
                if (pendingUserLocationRequests.has(normalizedCallId)) {
                    clearTimeout(timer);
                    pendingUserLocationRequests.delete(normalizedCallId);
                }
                resolve(value);
            },
            reject: (error) => {
                if (pendingUserLocationRequests.has(normalizedCallId)) {
                    clearTimeout(timer);
                    pendingUserLocationRequests.delete(normalizedCallId);
                }
                reject(error);
            },
            timer,
        });
    });
}

/**
 * Marks a pending location request as fulfilled.
 *
 * @private internal helper of USE USER LOCATION commitment
 */
export function fulfillUserLocation(callId: string, location: UserLocation): boolean {
    const normalizedCallId = callId?.trim();
    if (!normalizedCallId) {
        return false;
    }

    const request = cleanupUserLocationRequest(normalizedCallId);
    if (!request) {
        return false;
    }

    request.resolve(location);
    return true;
}

/**
 * Rejects a pending location request with an optional reason.
 *
 * @private internal helper of USE USER LOCATION commitment
 */
export function rejectUserLocationRequest(callId: string, reason?: string): boolean {
    const normalizedCallId = callId?.trim();
    if (!normalizedCallId) {
        return false;
    }

    const request = cleanupUserLocationRequest(normalizedCallId);
    if (!request) {
        return false;
    }

    request.reject(new Error(reason || 'The user declined to share their location.'));
    return true;
}
