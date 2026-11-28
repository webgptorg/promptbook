import type { ToolCall } from '@promptbook-local/types';
import { useCallback, useRef, useState } from 'react';
import type { UserLocationPromptParameter } from '../../../utils/userLocationPromptParameter';
import { parseToolResultObject } from './parseToolResultObject';

/**
 * Tool function name used by USE USER LOCATION.
 *
 * @private function of AgentChatWrapper
 */
const USER_LOCATION_TOOL_NAME = 'get_user_location';

/**
 * Location-tool status that means browser should request geolocation.
 *
 * @private function of AgentChatWrapper
 */
const USER_LOCATION_UNAVAILABLE_STATUS = 'unavailable';

/**
 * Geolocation error code for denied permissions.
 *
 * @private function of AgentChatWrapper
 */
const GEOLOCATION_PERMISSION_DENIED_CODE = 1;

/**
 * Timeout used for browser geolocation lookup.
 *
 * @private function of AgentChatWrapper
 */
const GEOLOCATION_REQUEST_TIMEOUT_MS = 15_000;

/**
 * Location tool result payload shape.
 *
 * @private function of AgentChatWrapper
 */
type UserLocationToolResult = {
    /**
     * Tool status indicator.
     */
    readonly status?: string;
};

/**
 * Result object returned by `useAgentChatBrowserLocation`.
 *
 * @private function of AgentChatWrapper
 */
type UseAgentChatBrowserLocationResult = {
    /**
     * User-location prompt parameter shared with the chat prompt.
     */
    readonly userLocationPromptParameter: UserLocationPromptParameter | null;
    /**
     * Requests browser geolocation and stores it for future prompt calls.
     */
    readonly requestBrowserUserLocation: () => Promise<void>;
};

/**
 * Parses location tool result into structured object.
 *
 * @private function of AgentChatWrapper
 */
function parseUserLocationToolResult(result: unknown): UserLocationToolResult | null {
    return parseToolResultObject(result) as UserLocationToolResult | null;
}

/**
 * Returns true when this tool call should trigger browser geolocation request.
 *
 * @private function of AgentChatWrapper
 */
export function shouldRequestBrowserUserLocation(toolCall: ToolCall): boolean {
    if (toolCall.name !== USER_LOCATION_TOOL_NAME) {
        return false;
    }

    const parsedResult = parseUserLocationToolResult(toolCall.result);
    return parsedResult?.status === USER_LOCATION_UNAVAILABLE_STATUS;
}

/**
 * Manages browser geolocation requests initiated by chat tool calls.
 *
 * @private function of AgentChatWrapper
 */
export function useAgentChatBrowserLocation(): UseAgentChatBrowserLocationResult {
    const [userLocationPromptParameter, setUserLocationPromptParameter] = useState<UserLocationPromptParameter | null>(
        null,
    );
    const isLocationRequestInFlightRef = useRef(false);

    /**
     * Requests geolocation from browser and stores it for next prompt calls.
     *
     * @private function of AgentChatWrapper
     */
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
            const geolocationError = error as GeolocationPositionError;
            const permission = geolocationError?.code === GEOLOCATION_PERMISSION_DENIED_CODE ? 'denied' : 'unavailable';
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
