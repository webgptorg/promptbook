import type { UserLocationPromptParameter } from '../../../utils/userLocationPromptParameter';

/**
 * Geolocation error code for denied permissions.
 */
const GEOLOCATION_PERMISSION_DENIED_CODE = 1;

/**
 * Timeout used for browser geolocation lookup.
 */
const GEOLOCATION_REQUEST_TIMEOUT_MS = 15_000;

/**
 * Requests browser geolocation and converts it into a prompt parameter payload.
 *
 * @private function of useAgentChatToolInteractions
 */
export async function requestBrowserUserLocationPromptParameter(): Promise<UserLocationPromptParameter> {
    if (typeof window === 'undefined' || !navigator.geolocation) {
        return {
            permission: 'unavailable',
        };
    }

    try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: GEOLOCATION_REQUEST_TIMEOUT_MS,
                maximumAge: 0,
            });
        });

        return {
            permission: 'granted',
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracyMeters: position.coords.accuracy,
            altitudeMeters: position.coords.altitude,
            headingDegrees: position.coords.heading,
            speedMetersPerSecond: position.coords.speed,
            timestamp: new Date(position.timestamp).toISOString(),
        };
    } catch (error) {
        const geolocationError = error as GeolocationPositionError;
        const permission = geolocationError?.code === GEOLOCATION_PERMISSION_DENIED_CODE ? 'denied' : 'unavailable';
        return { permission };
    }
}
