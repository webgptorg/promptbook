'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { scheduleClientNavigationFallback } from '../../../components/_utils/clientNavigationFallback';
import { dispatchNavigationProgressStart } from '../../../components/NavigationProgress/navigationProgressEvents';
import { buildAgentChatDestinationUrl } from './agentChatNavigationUtils';

/**
 * Inputs required to orchestrate the profile-to-chat navigation flow.
 *
 * @private internal type of <AgentProfileChat/>
 */
type UseAgentProfileChatNavigationProps = {
    chatRoute: string;
    isHistoryEnabled: boolean;
};

/**
 * Navigation state and helpers exposed to `AgentProfileChat`.
 *
 * @private internal type of <AgentProfileChat/>
 */
type UseAgentProfileChatNavigationResult = {
    isNavigatingToChat: boolean;
    startNavigatingToChat: () => void;
    navigateToDestination: (destination: string) => Promise<void>;
    navigateToChat: (options: { shouldForceNewChat: boolean }) => Promise<void>;
    resolveExistingChatHref: (chatId: string) => string;
    newChatHref: string;
};

/**
 * Maximum time the component will remain in the "navigating" visual state before
 * resetting back to interactive. This safety valve prevents a permanently blocked
 * profile page if both SPA navigation and its hard-navigation fallback fail.
 *
 * @private function of AgentProfileChat
 */
const PROFILE_CHAT_NAVIGATION_STATE_RESET_MS = 2_500;

/**
 * Resolves one existing-chat href from the agent chat route.
 */
function resolveAgentProfileExistingChatHref(chatRoute: string, chatId: string): string {
    return `${chatRoute}?chat=${encodeURIComponent(chatId)}`;
}

/**
 * Provides focused navigation helpers for the profile-page chat preview.
 *
 * @private function of AgentProfileChat
 */
export function useAgentProfileChatNavigation(
    props: UseAgentProfileChatNavigationProps,
): UseAgentProfileChatNavigationResult {
    const { chatRoute, isHistoryEnabled } = props;
    const router = useRouter();
    const [isNavigatingToChat, setIsNavigatingToChat] = useState(false);
    const pendingNavigationFallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isNavigatingToChatResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        void router.prefetch(chatRoute) /*.catch(() => undefined)*/;
    }, [chatRoute, router]);

    /**
     * Clears any pending hard-navigation fallback timer.
     */
    const clearPendingNavigationFallback = useCallback(() => {
        if (pendingNavigationFallbackTimeoutRef.current === null) {
            return;
        }

        clearTimeout(pendingNavigationFallbackTimeoutRef.current);
        pendingNavigationFallbackTimeoutRef.current = null;
    }, []);

    useEffect(() => {
        return () => {
            clearPendingNavigationFallback();

            if (isNavigatingToChatResetTimeoutRef.current !== null) {
                clearTimeout(isNavigatingToChatResetTimeoutRef.current);
                isNavigatingToChatResetTimeoutRef.current = null;
            }
        };
    }, [clearPendingNavigationFallback]);

    /**
     * Marks the profile panel as transitioning to the full chat page and schedules
     * a safety reset if the navigation stalls or is aborted.
     */
    const startNavigatingToChat = useCallback(() => {
        setIsNavigatingToChat(true);

        if (isNavigatingToChatResetTimeoutRef.current !== null) {
            clearTimeout(isNavigatingToChatResetTimeoutRef.current);
        }

        isNavigatingToChatResetTimeoutRef.current = setTimeout(() => {
            isNavigatingToChatResetTimeoutRef.current = null;
            console.warn(
                '[AgentProfileChat] Navigation to chat stalled - resetting transitioning state so the page remains interactive',
            );
            setIsNavigatingToChat(false);
        }, PROFILE_CHAT_NAVIGATION_STATE_RESET_MS);
    }, []);

    /**
     * Navigates to one chat destination and falls back to hard navigation when
     * the SPA transition does not change the current location in time.
     */
    const navigateToDestination = useCallback(
        (destination: string) => {
            startNavigatingToChat();
            dispatchNavigationProgressStart({ href: destination, source: 'router' });
            router.push(destination);

            clearPendingNavigationFallback();
            pendingNavigationFallbackTimeoutRef.current = scheduleClientNavigationFallback(
                destination,
                'AgentProfileChat',
            );

            return Promise.resolve();
        },
        [clearPendingNavigationFallback, router, startNavigatingToChat],
    );

    const navigateToChat = useCallback(
        ({ shouldForceNewChat }: { shouldForceNewChat: boolean }) => {
            const destination = buildAgentChatDestinationUrl(chatRoute, { shouldForceNewChat, isHistoryEnabled });
            return navigateToDestination(destination);
        },
        [chatRoute, isHistoryEnabled, navigateToDestination],
    );
    const resolveExistingChatHref = useCallback(
        (chatId: string) => resolveAgentProfileExistingChatHref(chatRoute, chatId),
        [chatRoute],
    );
    const newChatHref = useMemo(
        () => buildAgentChatDestinationUrl(chatRoute, { shouldForceNewChat: true, isHistoryEnabled }),
        [chatRoute, isHistoryEnabled],
    );

    return {
        isNavigatingToChat,
        startNavigatingToChat,
        navigateToDestination,
        navigateToChat,
        resolveExistingChatHref,
        newChatHref,
    };
}
