'use client';

import { createContext, type ReactNode, useContext } from 'react';
import { useBrowserPushNotificationsState } from './useBrowserPushNotificationsState';

/**
 * Browser permission states used by the push-notification provider.
 *
 * @private shared helper for the Agents Server UI
 */
export type BrowserPushNotificationPermission = NotificationPermission | 'unsupported';

/**
 * Focus payload describing the currently visible durable chat.
 *
 * @private shared helper for the Agents Server UI
 */
export type FocusedUserChat = {
    agentPermanentId: string;
    chatId: string;
    isChatFocused: boolean;
};

/**
 * Shared state exposed by the browser push-notification provider.
 *
 * @private shared helper for the Agents Server UI
 */
export type BrowserPushNotificationsContextValue = {
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
 *
 * @private shared helper for the Agents Server UI
 */
export function BrowserPushNotificationsProvider({
    children,
    defaultEnabled,
    pushPublicKey,
    isMetadataAvailable = true,
}: BrowserPushNotificationsProviderProps) {
    const contextValue = useBrowserPushNotificationsState({
        defaultEnabled,
        pushPublicKey,
        isMetadataAvailable,
    });

    return (
        <BrowserPushNotificationsContext.Provider value={contextValue}>
            {children}
        </BrowserPushNotificationsContext.Provider>
    );
}

/**
 * Reads the shared browser push-notification context.
 *
 * @private shared helper for the Agents Server UI
 */
export function useBrowserPushNotifications(): BrowserPushNotificationsContextValue {
    return useContext(BrowserPushNotificationsContext);
}
