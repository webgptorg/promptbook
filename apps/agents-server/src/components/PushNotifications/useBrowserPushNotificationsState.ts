'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import {
    deleteBrowserPushSubscription,
    fetchBrowserPushNotificationSettings,
    updateBrowserPushNotificationSettings,
    upsertBrowserPushSubscription,
} from '../../utils/browserPushNotificationsClient';
import type { UserPushNotificationSettingsSnapshot } from '../../utils/userPushNotificationSettings';
import { notifyError, notifySuccess } from '../Notifications/notifications';
import type {
    BrowserPushNotificationPermission,
    BrowserPushNotificationsContextValue,
    FocusedUserChat,
} from './BrowserPushNotificationsProvider';
import { useBrowserPushFocusedChatSync } from './useBrowserPushFocusedChatSync';

/**
 * Props consumed by the browser push-notification state hook.
 *
 * @private function of BrowserPushNotificationsProvider
 */
type UseBrowserPushNotificationsStateProps = {
    readonly defaultEnabled: boolean;
    readonly pushPublicKey: string | null;
    readonly isMetadataAvailable: boolean;
};

/**
 * URL registered for the shared service worker handling background push delivery.
 *
 * @private function of BrowserPushNotificationsProvider
 */
const BROWSER_PUSH_SERVICE_WORKER_URL = '/sw.js';

/**
 * Service-worker scope used for global push delivery in the Agents Server UI.
 *
 * @private function of BrowserPushNotificationsProvider
 */
const BROWSER_PUSH_SERVICE_WORKER_SCOPE = '/';

/**
 * Returns true when the current browser supports service-worker push notifications.
 *
 * @returns Whether the browser exposes the APIs required for push delivery.
 */
function isBrowserPushSupported(): boolean {
    return (
        typeof window !== 'undefined' &&
        typeof Notification !== 'undefined' &&
        'serviceWorker' in navigator &&
        'PushManager' in window
    );
}

/**
 * Resolves the current browser notification permission with a stable unsupported fallback.
 *
 * @returns Current permission state or `'unsupported'` when notifications are unavailable.
 */
function resolveBrowserPushNotificationPermissionStatus(): BrowserPushNotificationPermission {
    if (typeof Notification === 'undefined') {
        return 'unsupported';
    }

    return Notification.permission;
}

/**
 * Reads the current browser permission and requests it when the state is still undecided.
 *
 * @param setPermission - React state setter mirroring the latest browser permission.
 * @returns Resolved permission after any required prompt.
 */
async function requestAndStoreBrowserPushNotificationPermission(
    setPermission: Dispatch<SetStateAction<BrowserPushNotificationPermission>>,
): Promise<BrowserPushNotificationPermission> {
    let nextPermission = resolveBrowserPushNotificationPermissionStatus();
    setPermission(nextPermission);

    if (nextPermission === 'default') {
        nextPermission = await Notification.requestPermission();
        setPermission(nextPermission);
    }

    return nextPermission;
}

/**
 * Returns whether the persisted settings currently resolve to an enabled state.
 *
 * @param options.storedEnabled - Explicit user preference persisted on the server, when present.
 * @param options.resolvedDefaultEnabled - Metadata default used when the user has not chosen yet.
 * @returns Whether notifications should be treated as enabled by preference.
 */
function isBrowserPushPreferenceEnabled({
    storedEnabled,
    resolvedDefaultEnabled,
}: {
    storedEnabled: boolean | null;
    resolvedDefaultEnabled: boolean;
}): boolean {
    return storedEnabled ?? resolvedDefaultEnabled;
}

/**
 * Returns whether the one-time auto-prompt path is still eligible after a user message.
 *
 * @param options.hasConsumedAutoPrompt - Whether the one allowed automatic prompt was already used.
 * @param options.storedEnabled - Explicit user preference persisted on the server, when present.
 * @param options.resolvedDefaultEnabled - Metadata default used when the user has not chosen yet.
 * @param options.isConfigured - Whether server-side push configuration is available.
 * @returns Whether the auto-prompt path should run.
 */
function isBrowserPushAutoPromptAllowed({
    hasConsumedAutoPrompt,
    storedEnabled,
    resolvedDefaultEnabled,
    isConfigured,
}: {
    hasConsumedAutoPrompt: boolean;
    storedEnabled: boolean | null;
    resolvedDefaultEnabled: boolean;
    isConfigured: boolean;
}): boolean {
    return !hasConsumedAutoPrompt && storedEnabled === null && resolvedDefaultEnabled === true && isConfigured;
}

/**
 * Returns whether the provider should persist that the default-off hint was already shown.
 *
 * @param options.isLoading - Whether initial settings are still loading.
 * @param options.storedEnabled - Explicit user preference persisted on the server, when present.
 * @param options.resolvedDefaultEnabled - Metadata default used when the user has not chosen yet.
 * @param options.isConfigured - Whether server-side push configuration is available.
 * @returns Whether persisting the default-off hint is allowed.
 */
function isBrowserPushDefaultOffHintPersistable({
    isLoading,
    storedEnabled,
    resolvedDefaultEnabled,
    isConfigured,
}: {
    isLoading: boolean;
    storedEnabled: boolean | null;
    resolvedDefaultEnabled: boolean;
    isConfigured: boolean;
}): boolean {
    return !isLoading && !resolvedDefaultEnabled && storedEnabled === null && isConfigured;
}

/**
 * Returns whether denied browser permission requires the stored preference to be cleared.
 *
 * @param options.isLoading - Whether initial settings are still loading.
 * @param options.permission - Current browser notification permission.
 * @param options.storedEnabled - Explicit user preference persisted on the server, when present.
 * @param options.resolvedDefaultEnabled - Metadata default used when the user has not chosen yet.
 * @returns Whether denied-permission cleanup should run.
 */
function isDeniedBrowserPushCleanupNeeded({
    isLoading,
    permission,
    storedEnabled,
    resolvedDefaultEnabled,
}: {
    isLoading: boolean;
    permission: BrowserPushNotificationPermission;
    storedEnabled: boolean | null;
    resolvedDefaultEnabled: boolean;
}): boolean {
    return (
        !isLoading &&
        permission === 'denied' &&
        isBrowserPushPreferenceEnabled({
            storedEnabled,
            resolvedDefaultEnabled,
        })
    );
}

/**
 * Extracts the most useful message from one browser-push related failure.
 *
 * @param error - Unknown thrown value from one async browser push operation.
 * @param fallbackMessage - Message used when the thrown value is not an `Error`.
 * @returns User-facing error message.
 */
function resolveBrowserPushErrorMessage(error: unknown, fallbackMessage: string): string {
    return error instanceof Error ? error.message : fallbackMessage;
}

/**
 * Decodes one VAPID public key into the byte array required by `PushManager.subscribe`.
 *
 * @param value - Base64url-encoded VAPID public key.
 * @returns Binary application server key passed to the Push API.
 */
function convertBase64UrlToUint8Array(value: string): Uint8Array {
    const normalizedValue = `${value}${'='.repeat((4 - (value.length % 4 || 4)) % 4)}`
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    const rawValue = window.atob(normalizedValue);
    const output = new Uint8Array(rawValue.length);

    for (let index = 0; index < rawValue.length; index++) {
        output[index] = rawValue.charCodeAt(index);
    }

    return output;
}

/**
 * Drives browser push settings, permission state, subscription sync, and focused-chat heartbeats.
 *
 * @private function of BrowserPushNotificationsProvider
 */
export function useBrowserPushNotificationsState({
    defaultEnabled,
    pushPublicKey,
    isMetadataAvailable,
}: UseBrowserPushNotificationsStateProps): BrowserPushNotificationsContextValue {
    const [storedEnabled, setStoredEnabled] = useState<boolean | null>(null);
    const [resolvedDefaultEnabled, setResolvedDefaultEnabled] = useState(defaultEnabled);
    const [isLoading, setIsLoading] = useState(true);
    const [pendingMutationCount, setPendingMutationCount] = useState(0);
    const [permission, setPermission] = useState<BrowserPushNotificationPermission>(
        resolveBrowserPushNotificationPermissionStatus,
    );
    const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
    const [focusedChat, setFocusedChat] = useState<FocusedUserChat | null>(null);
    const registrationPromiseRef = useRef<Promise<ServiceWorkerRegistration> | null>(null);
    const subscriptionEndpointRef = useRef<string | null>(null);
    const hasConsumedAutoPromptRef = useRef(false);

    const isSupported = permission !== 'unsupported';
    const isConfigured = isMetadataAvailable && Boolean(pushPublicKey);
    const isEnabled =
        permission === 'granted' &&
        isConfigured &&
        isBrowserPushPreferenceEnabled({
            storedEnabled,
            resolvedDefaultEnabled,
        });

    /**
     * Mirrors one loaded or persisted settings snapshot into local React state.
     *
     * @param snapshot - Server snapshot describing the current stored/default settings.
     */
    const applyNotificationSettingsSnapshot = useCallback((snapshot: UserPushNotificationSettingsSnapshot): void => {
        setStoredEnabled(snapshot.storedEnabled);
        setResolvedDefaultEnabled(snapshot.defaultEnabled);
    }, []);

    /**
     * Increments the mutation counter around one async client/server sync operation.
     *
     * @param operation - Async operation to track as a pending mutation.
     * @returns Result of the wrapped operation.
     */
    const runWithPendingMutation = useCallback(async <T,>(operation: () => Promise<T>): Promise<T> => {
        setPendingMutationCount((value) => value + 1);

        try {
            return await operation();
        } finally {
            setPendingMutationCount((value) => Math.max(0, value - 1));
        }
    }, []);

    /**
     * Persists the current notification preference and mirrors it locally.
     *
     * @param enabled - Requested notification preference.
     * @returns Effective enabled state returned by the server snapshot.
     */
    const persistNotificationSettings = useCallback(
        async (enabled: boolean): Promise<boolean> => {
            const snapshot = await runWithPendingMutation(() => updateBrowserPushNotificationSettings(enabled));
            applyNotificationSettingsSnapshot(snapshot);
            return snapshot.enabled;
        },
        [applyNotificationSettingsSnapshot, runWithPendingMutation],
    );

    /**
     * Registers the shared service worker used for background push delivery.
     *
     * @returns Registered service worker for subsequent push-manager operations.
     */
    const ensureServiceWorkerRegistration = useCallback(async (): Promise<ServiceWorkerRegistration> => {
        if (!isBrowserPushSupported()) {
            throw new Error('Browser push notifications are not supported in this browser.');
        }

        if (!registrationPromiseRef.current) {
            registrationPromiseRef.current = navigator.serviceWorker.register(BROWSER_PUSH_SERVICE_WORKER_URL, {
                scope: BROWSER_PUSH_SERVICE_WORKER_SCOPE,
            });
        }

        return registrationPromiseRef.current;
    }, []);

    /**
     * Removes the current browser subscription locally and on the server.
     */
    const removeCurrentBrowserSubscription = useCallback(async (): Promise<void> => {
        let endpoint = subscriptionEndpointRef.current;

        if (isBrowserPushSupported()) {
            const registration = await ensureServiceWorkerRegistration().catch(() => null);
            const subscription = registration ? await registration.pushManager.getSubscription().catch(() => null) : null;

            if (subscription) {
                endpoint = subscription.endpoint;
                await subscription.unsubscribe().catch(() => undefined);
            }
        }

        await runWithPendingMutation(() =>
            deleteBrowserPushSubscription({
                subscriptionId,
                endpoint,
            }).catch((error) => {
                if (!subscriptionId && !endpoint) {
                    return;
                }

                throw error;
            }),
        );

        subscriptionEndpointRef.current = null;
        setSubscriptionId(null);
    }, [ensureServiceWorkerRegistration, runWithPendingMutation, subscriptionId]);

    /**
     * Persists the disabled state while intentionally swallowing cleanup failures.
     */
    const synchronizeDeniedPermissionState = useCallback(async (): Promise<void> => {
        await persistNotificationSettings(false).catch(() => undefined);
        await removeCurrentBrowserSubscription().catch(() => undefined);
    }, [persistNotificationSettings, removeCurrentBrowserSubscription]);

    /**
     * Ensures the current browser has one stored server-side push subscription.
     *
     * @returns `true` once the current browser subscription is synchronized.
     */
    const ensureCurrentBrowserSubscriptionSynced = useCallback(async (): Promise<boolean> => {
        if (!isConfigured || !pushPublicKey) {
            throw new Error('Push notifications are not configured on this server.');
        }

        if (!isBrowserPushSupported()) {
            throw new Error('Browser push notifications are not supported in this browser.');
        }

        const registration = await ensureServiceWorkerRegistration();
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertBase64UrlToUint8Array(pushPublicKey),
            });
        }

        const serializedSubscription = subscription.toJSON();
        if (
            !serializedSubscription.endpoint ||
            !serializedSubscription.keys?.p256dh ||
            !serializedSubscription.keys?.auth
        ) {
            throw new Error('Browser push subscription is missing required keys.');
        }

        subscriptionEndpointRef.current = subscription.endpoint;
        const response = await runWithPendingMutation(() =>
            upsertBrowserPushSubscription({
                subscription: serializedSubscription,
                userAgent: window.navigator.userAgent,
            }),
        );
        setSubscriptionId(response.subscriptionId);

        return true;
    }, [ensureServiceWorkerRegistration, isConfigured, pushPublicKey, runWithPendingMutation]);

    /**
     * Prompts the user for permission and enables notifications when possible.
     *
     * @param isSuccessToastVisible - Whether a success toast should be shown after enabling.
     * @returns Whether notifications ended up enabled.
     */
    const enableNotifications = useCallback(
        async (isSuccessToastVisible: boolean): Promise<boolean> => {
            if (!isBrowserPushSupported()) {
                notifyError('Browser notifications are not supported in this browser.');
                setPermission(resolveBrowserPushNotificationPermissionStatus());
                return false;
            }

            if (!isConfigured || !pushPublicKey) {
                notifyError('Push notifications are not configured on this server.');
                return false;
            }

            const nextPermission = await requestAndStoreBrowserPushNotificationPermission(setPermission);
            if (nextPermission === 'denied') {
                await synchronizeDeniedPermissionState();
                return false;
            }

            if (nextPermission !== 'granted') {
                return false;
            }

            try {
                await ensureCurrentBrowserSubscriptionSynced();
                const wasEnabled = await persistNotificationSettings(true);

                if (isSuccessToastVisible && wasEnabled) {
                    notifySuccess('Notifications enabled.');
                }

                return wasEnabled;
            } catch (error) {
                notifyError(resolveBrowserPushErrorMessage(error, 'Failed to enable notifications.'));
                return false;
            }
        },
        [
            ensureCurrentBrowserSubscriptionSynced,
            isConfigured,
            persistNotificationSettings,
            pushPublicKey,
            synchronizeDeniedPermissionState,
        ],
    );

    /**
     * Enables or disables notifications from explicit user UI actions.
     *
     * @param enabled - Requested notification state from the UI.
     * @returns Effective enabled state after the mutation completes.
     */
    const setNotificationsEnabled = useCallback(
        async (enabled: boolean): Promise<boolean> => {
            if (enabled) {
                return enableNotifications(true);
            }

            try {
                await persistNotificationSettings(false);
                await removeCurrentBrowserSubscription().catch(() => undefined);
                return false;
            } catch (error) {
                notifyError(resolveBrowserPushErrorMessage(error, 'Failed to disable notifications.'));
                return storedEnabled ?? resolvedDefaultEnabled;
            }
        },
        [enableNotifications, persistNotificationSettings, removeCurrentBrowserSubscription, resolvedDefaultEnabled, storedEnabled],
    );

    /**
     * Triggers the one automatic prompt path allowed after the user sends a message.
     */
    const maybePromptAfterUserMessageGesture = useCallback(() => {
        if (
            !isBrowserPushAutoPromptAllowed({
                hasConsumedAutoPrompt: hasConsumedAutoPromptRef.current,
                storedEnabled,
                resolvedDefaultEnabled,
                isConfigured,
            })
        ) {
            return;
        }

        hasConsumedAutoPromptRef.current = true;
        void enableNotifications(false);
    }, [enableNotifications, isConfigured, resolvedDefaultEnabled, storedEnabled]);

    /**
     * Persists the default-off state the first time the UI hints about notifications.
     *
     * @returns Whether the hint state was stored for the current browser user.
     */
    const rememberDefaultOffHintShown = useCallback(async (): Promise<boolean> => {
        if (
            !isBrowserPushDefaultOffHintPersistable({
                isLoading,
                storedEnabled,
                resolvedDefaultEnabled,
                isConfigured,
            })
        ) {
            return false;
        }

        await persistNotificationSettings(false).catch(() => undefined);
        return true;
    }, [isConfigured, isLoading, persistNotificationSettings, resolvedDefaultEnabled, storedEnabled]);

    useEffect(() => {
        if (!isBrowserPushSupported()) {
            setIsLoading(false);
            return;
        }

        void ensureServiceWorkerRegistration().catch((error) => {
            console.error('[push-notification]', 'service_worker_register_failed', error);
        });
    }, [ensureServiceWorkerRegistration]);

    useEffect(() => {
        /**
         * Mirrors the latest browser permission into React state after focus changes.
         */
        const synchronizePermission = (): void => {
            setPermission(resolveBrowserPushNotificationPermissionStatus());
        };

        synchronizePermission();
        if (typeof document === 'undefined' || typeof window === 'undefined') {
            return;
        }

        document.addEventListener('visibilitychange', synchronizePermission);
        window.addEventListener('focus', synchronizePermission);

        return () => {
            document.removeEventListener('visibilitychange', synchronizePermission);
            window.removeEventListener('focus', synchronizePermission);
        };
    }, []);

    useEffect(() => {
        let isDisposed = false;

        void fetchBrowserPushNotificationSettings()
            .then((snapshot) => {
                if (isDisposed) {
                    return;
                }

                applyNotificationSettingsSnapshot(snapshot);
                setIsLoading(false);
            })
            .catch((error) => {
                console.error('[push-notification]', 'settings_load_failed', error);
                if (!isDisposed) {
                    setIsLoading(false);
                }
            });

        return () => {
            isDisposed = true;
        };
    }, [applyNotificationSettingsSnapshot]);

    useEffect(() => {
        if (isLoading || !isEnabled) {
            return;
        }

        void ensureCurrentBrowserSubscriptionSynced().catch((error) => {
            notifyError(resolveBrowserPushErrorMessage(error, 'Failed to initialize browser notifications.'));
        });
    }, [ensureCurrentBrowserSubscriptionSynced, isEnabled, isLoading]);

    useEffect(() => {
        if (
            !isDeniedBrowserPushCleanupNeeded({
                isLoading,
                permission,
                storedEnabled,
                resolvedDefaultEnabled,
            })
        ) {
            return;
        }

        void synchronizeDeniedPermissionState();
    }, [isLoading, permission, resolvedDefaultEnabled, storedEnabled, synchronizeDeniedPermissionState]);

    useBrowserPushFocusedChatSync({
        focusedChat,
        isEnabled,
        subscriptionId,
    });

    return useMemo<BrowserPushNotificationsContextValue>(
        () => ({
            isSupported,
            isConfigured,
            permission,
            isLoading,
            isPersisting: pendingMutationCount > 0,
            isEnabled,
            storedEnabled,
            defaultEnabled: resolvedDefaultEnabled,
            setNotificationsEnabled,
            maybePromptAfterUserMessageGesture,
            rememberDefaultOffHintShown,
            setFocusedChat,
        }),
        [
            isSupported,
            isConfigured,
            permission,
            isLoading,
            pendingMutationCount,
            isEnabled,
            storedEnabled,
            resolvedDefaultEnabled,
            setNotificationsEnabled,
            maybePromptAfterUserMessageGesture,
            rememberDefaultOffHintShown,
        ],
    );
}
