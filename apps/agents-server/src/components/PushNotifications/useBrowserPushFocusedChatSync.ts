'use client';

import { useEffect } from 'react';
import { updateBrowserPushSubscriptionFocus } from '../../utils/browserPushNotificationsClient';
import type { FocusedUserChat } from './BrowserPushNotificationsProvider';

/**
 * Props consumed by the focused-chat synchronization hook.
 *
 * @private function of BrowserPushNotificationsProvider
 */
type UseBrowserPushFocusedChatSyncProps = {
    readonly focusedChat: FocusedUserChat | null;
    readonly isEnabled: boolean;
    readonly subscriptionId: string | null;
};

/**
 * Payload sent during steady-state focused-chat synchronization.
 *
 * @private function of BrowserPushNotificationsProvider
 */
type BrowserPushFocusedChatPayload = {
    readonly isChatFocused: boolean;
    readonly focusedAgentPermanentId: string | null;
    readonly focusedChatId: string | null;
};

/**
 * Payload sent while clearing focus during unload/page-hide cleanup.
 *
 * @private function of BrowserPushNotificationsProvider
 */
type BrowserPushFocusResetPayload = {
    readonly subscriptionId: string;
    readonly isChatFocused: false;
};

/**
 * Heartbeat cadence used while one chat stays focused in the current browser.
 *
 * @private function of BrowserPushNotificationsProvider
 */
const USER_PUSH_FOCUS_HEARTBEAT_INTERVAL_MS = 20_000;

/**
 * Builds the regular focus payload for the currently active durable chat.
 *
 * @param focusedChat - Chat focus state reported by the chat UI.
 * @returns Payload describing the current focus target.
 */
function createBrowserPushFocusedChatPayload(focusedChat: FocusedUserChat | null): BrowserPushFocusedChatPayload {
    if (focusedChat && focusedChat.isChatFocused) {
        return {
            isChatFocused: true,
            focusedAgentPermanentId: focusedChat.agentPermanentId,
            focusedChatId: focusedChat.chatId,
        };
    }

    return {
        isChatFocused: false,
        focusedAgentPermanentId: null,
        focusedChatId: null,
    };
}

/**
 * Builds the keepalive payload used to clear focus while the page is closing.
 *
 * @param subscriptionId - Browser push subscription identifier stored on the server.
 * @returns Minimal cleanup payload for keepalive requests.
 */
function createBrowserPushFocusResetPayload(subscriptionId: string): BrowserPushFocusResetPayload {
    return {
        subscriptionId,
        isChatFocused: false,
    };
}

/**
 * Keeps the current browser push subscription aligned with the focused durable chat.
 *
 * @private function of BrowserPushNotificationsProvider
 */
export function useBrowserPushFocusedChatSync({
    focusedChat,
    isEnabled,
    subscriptionId,
}: UseBrowserPushFocusedChatSyncProps): void {
    useEffect(() => {
        if (!subscriptionId || !isEnabled) {
            return;
        }

        const nextFocusPayload = createBrowserPushFocusedChatPayload(focusedChat);
        const resetFocusPayload = createBrowserPushFocusResetPayload(subscriptionId);
        let isDisposed = false;

        /**
         * Synchronizes the current focus snapshot to the server.
         *
         * @param keepalive - Whether to use a keepalive request for lifecycle flushes.
         */
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

        /**
         * Clears the current focus state using a keepalive request during page teardown.
         */
        const resetFocusState = async (): Promise<void> => {
            await updateBrowserPushSubscriptionFocus(resetFocusPayload, { keepalive: true });
        };

        /**
         * Flushes the focus reset request without surfacing page-hide cleanup errors.
         */
        const flushFocusOnPageHide = () => {
            void resetFocusState().catch(() => undefined);
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

        window.addEventListener('pagehide', flushFocusOnPageHide);
        window.addEventListener('beforeunload', flushFocusOnPageHide);

        return () => {
            isDisposed = true;
            window.clearInterval(interval);
            window.removeEventListener('pagehide', flushFocusOnPageHide);
            window.removeEventListener('beforeunload', flushFocusOnPageHide);
            void resetFocusState().catch(() => undefined);
        };
    }, [focusedChat, isEnabled, subscriptionId]);
}
