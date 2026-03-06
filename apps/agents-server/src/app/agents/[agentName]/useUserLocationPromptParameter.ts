'use client';

import { useCallback, useRef, useState } from 'react';
import type { UserLocationPromptParameter } from '../../../utils/userLocationPromptParameter';

/** Geolocation error code for denied permissions. */
const GEOLOCATION_PERMISSION_DENIED_CODE = 1;
/** Timeout used for browser geolocation lookup. */
const GEOLOCATION_REQUEST_TIMEOUT_MS = 15_000;

/**
 * Manages geolocation state for AgentChatWrapper.
 *
 * @private hook of AgentChatWrapper
 */
export function useUserLocationPromptParameter(): {
    userLocationPromptParameter: UserLocationPromptParameter | null;
    requestBrowserUserLocation: () => Promise<void>;
} {
    const [userLocationPromptParameter, setUserLocationPromptParameter] =
        useState<UserLocationPromptParameter | null>(null);
    const isLocationRequestInFlightRef = useRef(false);

    const requestBrowserUserLocation = useCallback(async () => {
        if (isLocationRequestInFlightRef.current) {
            return;
        }

        if (typeof window === 'undefined' || !navigator.geolocation) {
            setUserLocationPromptParameter({
                permission: 'unavailable',
            });
            return;
        }

        isLocationRequestInFlightRef.current = true;

        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: GEOLOCATION_REQUEST_TIMEOUT_MS,
                    maximumAge: 0,
                });
            });

            setUserLocationPromptParameter({
                permission: 'granted',
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracyMeters: position.coords.accuracy,
                altitudeMeters: position.coords.altitude,
                headingDegrees: position.coords.heading,
                speedMetersPerSecond: position.coords.speed,
                timestamp: new Date(position.timestamp).toISOString(),
            });
        } catch (error) {
            const geolocationError = error as GeolocationPositionError | null;
            const permission =
                geolocationError?.code === GEOLOCATION_PERMISSION_DENIED_CODE ? 'denied' : 'unavailable';
            setUserLocationPromptParameter({ permission });
        } finally {
            isLocationRequestInFlightRef.current = false;
        }
    }, []);

    return {
        userLocationPromptParameter,
        requestBrowserUserLocation,
    };
}
