import { describe, expect, it } from '@jest/globals';
import {
    parseUserLocationPromptParameter,
    serializeUserLocationPromptParameter,
} from './userLocationPromptParameter';

describe('userLocationPromptParameter', () => {
    it('serializes and parses granted browser location', () => {
        const serialized = serializeUserLocationPromptParameter({
            permission: 'granted',
            latitude: 50.087451,
            longitude: 14.420671,
            accuracyMeters: 12,
            timestamp: '2026-02-18T12:00:00.000Z',
        });

        const parsed = parseUserLocationPromptParameter(serialized);

        expect(parsed).toMatchObject({
            permission: 'granted',
            latitude: 50.087451,
            longitude: 14.420671,
            accuracyMeters: 12,
            timestamp: '2026-02-18T12:00:00.000Z',
        });
    });

    it('returns undefined for malformed payload', () => {
        expect(parseUserLocationPromptParameter('{not-valid-json')).toBeUndefined();
        expect(parseUserLocationPromptParameter('42')).toBeUndefined();
    });
});
