'use client';

import { createAnonymousUserRequestHeaders } from './anonymousUserClient';
import type { UserPushNotificationSettingsSnapshot } from './userPushNotificationSettings';

/**
 * Response returned after a browser subscription is stored on the server.
 */
export type BrowserPushSubscriptionSyncResponse = {
    subscriptionId: string;
};

/**
 * Loads the current browser user's push-notification preference snapshot.
 */
export async function fetchBrowserPushNotificationSettings(): Promise<UserPushNotificationSettingsSnapshot> {
    const response = await fetch('/api/settings/notifications', {
        method: 'GET',
        cache: 'no-store',
        headers: createAnonymousUserRequestHeaders(),
    });

    if (!response.ok) {
        throw new Error('Failed to load notification settings.');
    }

    return (await response.json()) as UserPushNotificationSettingsSnapshot;
}

/**
 * Persists one push-notification preference for the current browser user.
 */
export async function updateBrowserPushNotificationSettings(
    enabled: boolean,
): Promise<UserPushNotificationSettingsSnapshot> {
    const response = await fetch('/api/settings/notifications', {
        method: 'PUT',
        headers: createAnonymousUserRequestHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ enabled }),
    });

    if (!response.ok) {
        throw new Error('Failed to save notification settings.');
    }

    return (await response.json()) as UserPushNotificationSettingsSnapshot;
}

/**
 * Stores or refreshes the current browser push subscription on the server.
 */
export async function upsertBrowserPushSubscription(options: {
    subscription: PushSubscriptionJSON;
    userAgent?: string | null;
}): Promise<BrowserPushSubscriptionSyncResponse> {
    const response = await fetch('/api/push-subscriptions', {
        method: 'PUT',
        headers: createAnonymousUserRequestHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(options),
    });

    if (!response.ok) {
        throw new Error('Failed to save push subscription.');
    }

    return (await response.json()) as BrowserPushSubscriptionSyncResponse;
}

/**
 * Removes the current browser push subscription from the server.
 */
export async function deleteBrowserPushSubscription(options: {
    subscriptionId?: string | null;
    endpoint?: string | null;
}): Promise<void> {
    const response = await fetch('/api/push-subscriptions', {
        method: 'DELETE',
        headers: createAnonymousUserRequestHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(options),
    });

    if (!response.ok) {
        throw new Error('Failed to remove push subscription.');
    }
}

/**
 * Updates the focused-chat heartbeat for the current browser subscription.
 */
export async function updateBrowserPushSubscriptionFocus(
    options: {
        subscriptionId: string;
        isChatFocused: boolean;
        focusedAgentPermanentId?: string | null;
        focusedChatId?: string | null;
    },
    requestOptions: {
        keepalive?: boolean;
    } = {},
): Promise<void> {
    const response = await fetch('/api/push-subscriptions', {
        method: 'PATCH',
        headers: createAnonymousUserRequestHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(options),
        keepalive: requestOptions.keepalive,
    });

    if (!response.ok) {
        throw new Error('Failed to update push focus state.');
    }
}
