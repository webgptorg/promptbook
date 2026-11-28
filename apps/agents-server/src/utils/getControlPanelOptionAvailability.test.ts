import { describe, expect, it } from '@jest/globals';
import {
    CONTROL_PANEL_OPTION_AVAILABILITY_METADATA_KEYS,
    getControlPanelOptionAvailability,
} from './getControlPanelOptionAvailability';

/**
 * Creates a sparse metadata map for control-panel availability tests.
 *
 * @param overrides - Metadata values relevant to the current test case.
 * @returns Metadata map shaped like `getMetadataMap(...)` output.
 */
function createMetadata(overrides: Record<string, string | null | undefined> = {}): Record<string, string | null | undefined> {
    return Object.fromEntries(
        CONTROL_PANEL_OPTION_AVAILABILITY_METADATA_KEYS.map((key) => [key, overrides[key] ?? null]),
    );
}

describe('getControlPanelOptionAvailability', () => {
    it('keeps control-panel options visible by default when metadata does not hide them', () => {
        expect(
            getControlPanelOptionAvailability({
                metadata: createMetadata(),
                isPushNotificationsConfigured: true,
            }),
        ).toEqual({
            sound: true,
            vibration: true,
            notifications: true,
            selfLearning: true,
            privateMode: true,
            language: true,
            chatVisualMode: true,
        });
    });

    it('hides notifications when runtime push delivery is not configured', () => {
        expect(
            getControlPanelOptionAvailability({
                metadata: createMetadata(),
                isPushNotificationsConfigured: false,
            }).notifications,
        ).toBe(false);
    });

    it('respects explicit metadata overrides and enforced server language', () => {
        expect(
            getControlPanelOptionAvailability({
                metadata: createMetadata({
                    IS_CONTROL_PANEL_NOTIFICATIONS_ENABLED: 'false',
                    IS_CONTROL_PANEL_PRIVATE_MODE_ENABLED: 'false',
                    IS_CONTROL_PANEL_LANGUAGE_ENABLED: 'true',
                    IS_SERVER_LANGUAGE_ENFORCED: 'true',
                }),
                isPushNotificationsConfigured: true,
            }),
        ).toEqual({
            sound: true,
            vibration: true,
            notifications: false,
            selfLearning: true,
            privateMode: false,
            language: false,
            chatVisualMode: true,
        });
    });
});
