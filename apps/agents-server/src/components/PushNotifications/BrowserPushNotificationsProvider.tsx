'use client';

import {
    createContext,
    type ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    deleteBrowserPushSubscription,
    fetchBrowserPushNotificationSettings,
    updateBrowserPushNotificationSettings,
    updateBrowserPushSubscriptionFocus,
    upsertBrowserPushSubscription,
} from '../../utils/browserPushNotificationsClient';
import { notifyError, notifySuccess } from '../Notifications/notifications';

/**
 * Browser permission states used by the push-notification provider.
 */
export type BrowserPushNotificationPermission = NotificationPermission | 'unsupported';

/**
 * Focus payload describing the currently visible durable chat.
 */
export type FocusedUserChat = {
    agentPermanentId: string;
    chatId: string;
    isChatFocused: boolean;
};

/**
 * Shared state exposed by the browser push-notification provider.
 */
type BrowserPushNotificationsContextValue = {
    isSupported: boolean;
    isConfigured: boolean;
    permission: BrowserPushNotificationPermission;
    isLoading: boolean;
    isPersisting: boolean;
    isEnabled: boolean;
    storedEnabled: boolean | null;
    defaultEnabled: boolean;
    setNotificationsEnabled: (enabled: boolean) => Promise<boolean>;
    maybePromptAfterUserMessageGesture: () => void;
    rememberDefaultOffHintShown: () => Promise<boolean>;
    setFocusedChat: (focusedChat: FocusedUserChat | null) => void;
};

/**
 * Heartbeat cadence used while one chat stays focused in the current browser.
 */
const USER_PUSH_FOCUS_HEARTBEAT_INTERVAL_MS = 20_000;

/**
 * Default context used before the provider mounts.
 */
const defaultBrowserPushNotificationsContextValue: BrowserPushNotificationsContextValue = {
    isSupported: false,
    isConfigured: false,
    permission: 'unsupported',
    isLoading: true,
    isPersisting: false,
    isEnabled: false,
    storedEnabled: null,
    defaultEnabled: false,
    setNotificationsEnabled: async () => false,
    maybePromptAfterUserMessageGesture: () => undefined,
    rememberDefaultOffHintShown: async () => false,
    setFocusedChat: () => undefined,
};

/**
 * React context storing the current browser push-notification state.
 */
const BrowserPushNotificationsContext = createContext<BrowserPushNotificationsContextValue>(
    defaultBrowserPushNotificationsContextValue,
);

/**
 * Props accepted by the browser push-notification provider.
 */
type BrowserPushNotificationsProviderProps = {
    children: ReactNode;
    defaultEnabled: boolean;
    pushPublicKey: string | null;
    isMetadataAvailable?: boolean;
};

/**
 * Provides browser push-notification state, service-worker registration, and focused-chat heartbeats.
 */
export function BrowserPushNotificationsProvider({
    children,
    defaultEnabled,
    pushPublicKey,
    isMetadataAvailable = true,
}: BrowserPushNotificationsProviderProps) {
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
    const isEnabled = permission === 'granted' && isConfigured && (storedEnabled ?? resolvedDefaultEnabled);

    /**
     * Increments the mutation counter around one async client/server sync operation.
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
     */
    const persistNotificationSettings = useCallback(
        async (enabled: boolean): Promise<boolean> => {
            const snapshot = await runWithPendingMutation(() => updateBrowserPushNotificationSettings(enabled));
            setStoredEnabled(snapshot.storedEnabled);
            setResolvedDefaultEnabled(snapshot.defaultEnabled);
            return snapshot.enabled;
        },
        [runWithPendingMutation],
    );

    /**
     * Registers the global service worker used for background delivery.
     */
    const ensureServiceWorkerRegistration = useCallback(async (): Promise<ServiceWorkerRegistration> => {
        if (!isBrowserPushSupported()) {
            throw new Error('Browser push notifications are not supported in this browser.');
        }

        if (!registrationPromiseRef.current) {
            registrationPromiseRef.current = navigator.serviceWorker.register('/sw.js', { scope: '/' });
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
     * Ensures the current browser has one stored server-side push subscription.
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
     */
    const enableNotifications = useCallback(
        async (showSuccessToast: boolean): Promise<boolean> => {
            if (!isBrowserPushSupported()) {
                notifyError('Browser notifications are not supported in this browser.');
                setPermission(resolveBrowserPushNotificationPermissionStatus());
                return false;
            }

            if (!isConfigured || !pushPublicKey) {
                notifyError('Push notifications are not configured on this server.');
                return false;
            }

            let nextPermission = resolveBrowserPushNotificationPermissionStatus();
            setPermission(nextPermission);

            if (nextPermission === 'default') {
                nextPermission = await Notification.requestPermission();
                setPermission(nextPermission);
            }

            if (nextPermission === 'denied') {
                await persistNotificationSettings(false).catch(() => undefined);
                await removeCurrentBrowserSubscription().catch(() => undefined);
                return false;
            }

            if (nextPermission !== 'granted') {
                return false;
            }

            try {
                await ensureCurrentBrowserSubscriptionSynced();
                const wasEnabled = await persistNotificationSettings(true);

                if (showSuccessToast && wasEnabled) {
                    notifySuccess('Notifications enabled.');
                }

                return wasEnabled;
            } catch (error) {
                notifyError(error instanceof Error ? error.message : 'Failed to enable notifications.');
                return false;
            }
        },
        [
            ensureCurrentBrowserSubscriptionSynced,
            persistNotificationSettings,
            isConfigured,
            pushPublicKey,
            removeCurrentBrowserSubscription,
        ],
    );

    /**
     * Enables or disables notifications from explicit user UI actions.
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
                notifyError(error instanceof Error ? error.message : 'Failed to disable notifications.');
                return storedEnabled ?? resolvedDefaultEnabled;
            }
        },
        [enableNotifications, persistNotificationSettings, removeCurrentBrowserSubscription, resolvedDefaultEnabled, storedEnabled],
    );

    /**
     * Triggers the only automatic permission prompt path allowed after a user sends a message.
     */
    const maybePromptAfterUserMessageGesture = useCallback(() => {
        if (hasConsumedAutoPromptRef.current) {
            return;
        }

        if (storedEnabled !== null || resolvedDefaultEnabled !== true || !isConfigured) {
            return;
        }

        hasConsumedAutoPromptRef.current = true;
        void enableNotifications(false);
    }, [enableNotifications, isConfigured, resolvedDefaultEnabled, storedEnabled]);

    /**
     * Persists the default-off state the first time we gently hint about notifications.
     */
    const rememberDefaultOffHintShown = useCallback(async (): Promise<boolean> => {
        if (isLoading || resolvedDefaultEnabled || storedEnabled !== null || !isConfigured) {
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

                setStoredEnabled(snapshot.storedEnabled);
                setResolvedDefaultEnabled(snapshot.defaultEnabled);
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
    }, []);

    useEffect(() => {
        if (isLoading || !isEnabled) {
            return;
        }

        void ensureCurrentBrowserSubscriptionSynced().catch((error) => {
            notifyError(error instanceof Error ? error.message : 'Failed to initialize browser notifications.');
        });
    }, [ensureCurrentBrowserSubscriptionSynced, isEnabled, isLoading]);

    useEffect(() => {
        if (
            isLoading ||
            permission !== 'denied' ||
            (storedEnabled !== true && !(storedEnabled === null && resolvedDefaultEnabled))
        ) {
            return;
        }

        void persistNotificationSettings(false).catch(() => undefined);
        void removeCurrentBrowserSubscription().catch(() => undefined);
    }, [isLoading, permission, persistNotificationSettings, removeCurrentBrowserSubscription, resolvedDefaultEnabled, storedEnabled]);

    useEffect(() => {
        if (!subscriptionId || !isEnabled) {
            return;
        }

        const nextFocusPayload = focusedChat && focusedChat.isChatFocused
            ? {
                  isChatFocused: true,
                  focusedAgentPermanentId: focusedChat.agentPermanentId,
                  focusedChatId: focusedChat.chatId,
              }
            : {
                  isChatFocused: false,
                  focusedAgentPermanentId: null,
                  focusedChatId: null,
              };

        let isDisposed = false;
        const synchronizeFocus = async (keepalive = false): Promise<void> => {
            try {
                await updateBrowserPushSubscriptionFocus(
                    {
                        subscriptionId,
                        ...nextFocusPayload,
                    },
                    { keepalive },
                );
            } catch (error) {
                if (!isDisposed) {
                    console.error('[push-notification]', 'focus_sync_failed', error);
                }
            }
        };

        void synchronizeFocus();

        if (!nextFocusPayload.isChatFocused) {
            return () => {
                isDisposed = true;
            };
        }

        const interval = window.setInterval(() => {
            void synchronizeFocus();
        }, USER_PUSH_FOCUS_HEARTBEAT_INTERVAL_MS);

        const flushFocusOnPageHide = () => {
            void updateBrowserPushSubscriptionFocus(
                {
                    subscriptionId,
                    isChatFocused: false,
                },
                { keepalive: true },
            ).catch(() => undefined);
        };

        window.addEventListener('pagehide', flushFocusOnPageHide);
        window.addEventListener('beforeunload', flushFocusOnPageHide);

        return () => {
            isDisposed = true;
            window.clearInterval(interval);
            window.removeEventListener('pagehide', flushFocusOnPageHide);
            window.removeEventListener('beforeunload', flushFocusOnPageHide);
            void updateBrowserPushSubscriptionFocus(
                {
                    subscriptionId,
                    isChatFocused: false,
                },
                { keepalive: true },
            ).catch(() => undefined);
        };
    }, [focusedChat, isEnabled, subscriptionId]);

    const contextValue = useMemo<BrowserPushNotificationsContextValue>(
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

    return (
        <BrowserPushNotificationsContext.Provider value={contextValue}>
            {children}
        </BrowserPushNotificationsContext.Provider>
    );
}

/**
 * Reads the shared browser push-notification context.
 */
export function useBrowserPushNotifications(): BrowserPushNotificationsContextValue {
    return useContext(BrowserPushNotificationsContext);
}

/**
 * Returns true when the current browser supports service-worker push notifications.
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
 */
function resolveBrowserPushNotificationPermissionStatus(): BrowserPushNotificationPermission {
    if (typeof Notification === 'undefined') {
        return 'unsupported';
    }

    return Notification.permission;
}

/**
 * Decodes one VAPID public key into the byte array required by `PushManager.subscribe`.
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
