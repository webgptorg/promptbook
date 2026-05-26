jest.mock('./userData', () => ({
    getUserDataValue: jest.fn(),
    upsertUserDataValue: jest.fn(),
}));

jest.mock('../database/getMetadata', () => ({
    getMetadata: jest.fn(),
}));

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { THEME_MODES } from '../constants/themeMode';
import { getMetadata } from '../database/getMetadata';
import {
    getUserThemeModeSettingsSnapshotForUser,
    normalizeUserThemeModeSettingsRecord,
    setUserThemeModeSettingsForUser,
} from './userThemeModeSettings';
import { getUserDataValue, upsertUserDataValue } from './userData';

describe('userThemeModeSettings', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(getMetadata).mockResolvedValue(THEME_MODES.SYSTEM);
    });

    it('normalizes only supported persisted theme records', () => {
        expect(
            normalizeUserThemeModeSettingsRecord({
                version: 1,
                themeMode: THEME_MODES.DARK,
            }),
        ).toEqual({
            version: 1,
            themeMode: THEME_MODES.DARK,
        });

        expect(
            normalizeUserThemeModeSettingsRecord({
                version: 2,
                themeMode: THEME_MODES.DARK,
            }),
        ).toBeNull();

        expect(
            normalizeUserThemeModeSettingsRecord({
                version: 1,
                themeMode: 'SEPIA',
            }),
        ).toEqual({
            version: 1,
            themeMode: THEME_MODES.SYSTEM,
        });
    });

    it('falls back to DEFAULT_THEME metadata when the user has no saved preference', async () => {
        jest.mocked(getUserDataValue).mockResolvedValue(null);
        jest.mocked(getMetadata).mockResolvedValue(THEME_MODES.DARK);

        await expect(getUserThemeModeSettingsSnapshotForUser(17)).resolves.toEqual({
            themeMode: THEME_MODES.DARK,
        });
    });

    it('prefers the saved user theme over the metadata default', async () => {
        jest.mocked(getUserDataValue).mockResolvedValue({
            version: 1,
            themeMode: THEME_MODES.LIGHT,
        });
        jest.mocked(getMetadata).mockResolvedValue(THEME_MODES.DARK);

        await expect(getUserThemeModeSettingsSnapshotForUser(17)).resolves.toEqual({
            themeMode: THEME_MODES.LIGHT,
        });
    });

    it('persists explicit theme selections for the current user', async () => {
        await expect(setUserThemeModeSettingsForUser(17, THEME_MODES.DARK)).resolves.toEqual({
            version: 1,
            themeMode: THEME_MODES.DARK,
        });

        expect(upsertUserDataValue).toHaveBeenCalledWith({
            userId: 17,
            key: 'settings:theme-mode',
            value: {
                version: 1,
                themeMode: THEME_MODES.DARK,
            },
        });
    });
});
