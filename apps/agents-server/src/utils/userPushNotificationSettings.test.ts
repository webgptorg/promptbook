import { normalizeUserPushNotificationSettingsRecord } from './userPushNotificationSettings';

describe('normalizeUserPushNotificationSettingsRecord', () => {
    it('accepts the persisted notification shape', () => {
        expect(
            normalizeUserPushNotificationSettingsRecord({
                version: 1,
                enabled: true,
            }),
        ).toEqual({
            version: 1,
            enabled: true,
        });
    });

    it('rejects unknown versions', () => {
        expect(
            normalizeUserPushNotificationSettingsRecord({
                version: 2,
                enabled: true,
            }),
        ).toBeNull();
    });

    it('rejects non-boolean enabled values', () => {
        expect(
            normalizeUserPushNotificationSettingsRecord({
                version: 1,
                enabled: 'true',
            }),
        ).toBeNull();
    });
});
