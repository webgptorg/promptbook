'use client';

import { createAnonymousUserRequestHeaders } from './anonymousUserClient';
import { resolveThemeMode, type ThemeMode } from '../constants/themeMode';
import type { UserThemeModeSettingsSnapshot } from './userThemeModeSettings';

/**
 * Loads the current browser user's theme preference.
 */
export async function fetchThemeModeSettings(): Promise<UserThemeModeSettingsSnapshot> {
    const response = await fetch('/api/settings/theme', {
        method: 'GET',
        cache: 'no-store',
        headers: createAnonymousUserRequestHeaders(),
    });

    if (!response.ok) {
        throw new Error('Failed to load theme settings.');
    }

    const snapshot = (await response.json()) as UserThemeModeSettingsSnapshot;

    return {
        themeMode: resolveThemeMode(snapshot.themeMode),
    };
}

/**
 * Persists one theme preference for the current browser user.
 */
export async function updateThemeModeSettings(themeMode: ThemeMode): Promise<UserThemeModeSettingsSnapshot> {
    const response = await fetch('/api/settings/theme', {
        method: 'PUT',
        headers: createAnonymousUserRequestHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ themeMode }),
    });

    if (!response.ok) {
        throw new Error('Failed to save theme settings.');
    }

    const snapshot = (await response.json()) as UserThemeModeSettingsSnapshot;

    return {
        themeMode: resolveThemeMode(snapshot.themeMode),
    };
}
