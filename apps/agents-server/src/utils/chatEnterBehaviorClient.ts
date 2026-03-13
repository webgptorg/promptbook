'use client';

import { createAnonymousUserRequestHeaders } from './anonymousUserClient';
import type {
    AgentsServerChatEnterBehavior,
    ChatEnterBehaviorSettingsSnapshot,
} from './chatEnterBehaviorSettings';

/**
 * Loads the current browser user's chat keybinding preference.
 *
 * @private shared helper for the Agents Server browser client
 */
export async function fetchChatEnterBehaviorSettings(): Promise<ChatEnterBehaviorSettingsSnapshot> {
    const response = await fetch('/api/settings/keybindings', {
        method: 'GET',
        cache: 'no-store',
        headers: createAnonymousUserRequestHeaders(),
    });

    if (!response.ok) {
        throw new Error('Failed to load chat keybindings.');
    }

    return (await response.json()) as ChatEnterBehaviorSettingsSnapshot;
}

/**
 * Persists one chat keybinding preference for the current browser user.
 *
 * @private shared helper for the Agents Server browser client
 */
export async function updateChatEnterBehaviorSettings(
    enterBehavior: AgentsServerChatEnterBehavior,
): Promise<ChatEnterBehaviorSettingsSnapshot> {
    const response = await fetch('/api/settings/keybindings', {
        method: 'PUT',
        headers: createAnonymousUserRequestHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ enterBehavior }),
    });

    if (!response.ok) {
        throw new Error('Failed to save chat keybindings.');
    }

    return (await response.json()) as ChatEnterBehaviorSettingsSnapshot;
}
