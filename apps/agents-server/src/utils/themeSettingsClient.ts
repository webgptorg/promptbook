'use client';

import { createAnonymousUserRequestHeaders } from './anonymousUserClient';
import type { ThemeSettingsSnapshot } from './themeSettings';
import type { AgentsServerThemePreference } from '../constants/themePreferences';

/**
 * Loads the current browser user's theme preference.
 *
 * @private shared helper for the Agents Server browser client
 */
export async function fetchThemeSettings(): Promise<ThemeSettingsSnapshot> {
    const response = await fetch('/api/settings/theme', {
        method: 'GET',
        cache: 'no-store',
        headers: createAnonymousUserRequestHeaders(),
    });

    if (!response.ok) {
        throw new Error('Failed to load theme settings.');
    }

    return (await response.json()) as ThemeSettingsSnapshot;
}

/**
 * Persists one theme preference for the current browser user.
 *
 * @private shared helper for the Agents Server browser client
 */
export async function updateThemeSettings(
    preference: AgentsServerThemePreference,
): Promise<ThemeSettingsSnapshot> {
    const response = await fetch('/api/settings/theme', {
        method: 'PUT',
        headers: createAnonymousUserRequestHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ preference }),
    });

    if (!response.ok) {
        throw new Error('Failed to save theme settings.');
    }

    return (await response.json()) as ThemeSettingsSnapshot;
}
