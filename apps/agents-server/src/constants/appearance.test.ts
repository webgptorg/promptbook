import { describe, expect, it } from '@jest/globals';
import { APPEARANCE_PREFERENCES, resolveAppearancePreference, resolveResolvedAppearance } from './appearance';

describe('appearance constants', () => {
    it('resolves explicit appearance preferences', () => {
        expect(resolveAppearancePreference(APPEARANCE_PREFERENCES.DARK)).toBe(APPEARANCE_PREFERENCES.DARK);
        expect(resolveAppearancePreference(APPEARANCE_PREFERENCES.LIGHT)).toBe(APPEARANCE_PREFERENCES.LIGHT);
    });

    it('falls back to SYSTEM for unknown values', () => {
        expect(resolveAppearancePreference('unknown')).toBe(APPEARANCE_PREFERENCES.SYSTEM);
        expect(resolveAppearancePreference(null)).toBe(APPEARANCE_PREFERENCES.SYSTEM);
    });

    it('resolves SYSTEM appearance from the operating system preference', () => {
        expect(resolveResolvedAppearance(APPEARANCE_PREFERENCES.SYSTEM, true)).toBe(APPEARANCE_PREFERENCES.DARK);
        expect(resolveResolvedAppearance(APPEARANCE_PREFERENCES.SYSTEM, false)).toBe(APPEARANCE_PREFERENCES.LIGHT);
    });

    it('keeps explicit LIGHT and DARK preferences unchanged', () => {
        expect(resolveResolvedAppearance(APPEARANCE_PREFERENCES.DARK, false)).toBe(APPEARANCE_PREFERENCES.DARK);
        expect(resolveResolvedAppearance(APPEARANCE_PREFERENCES.LIGHT, true)).toBe(APPEARANCE_PREFERENCES.LIGHT);
    });
});
