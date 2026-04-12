'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { notifyError } from '../../../../components/Notifications/notifications';
import { saveUserChatDraft } from '../../../../utils/userChatClient';

/**
 * Debounce window for durable chat-draft persistence.
 *
 * @private function of useAgentChatHistoryClientState
 */
const SAVE_DEBOUNCE_MS = 600;

/**
 * Inputs required to manage the active durable chat draft.
 *
 * @private function of useAgentChatHistoryClientState
 */
type UseAgentChatHistoryDraftStateProps = {
    readonly agentName: string;
    readonly shouldUseHistory: boolean;
    readonly activeChatIdRef: { current: string | null };
    readonly isOptimisticChatId: (chatId: string) => boolean;
};

/**
 * Draft state and persistence handlers shared by the durable chat-history flow.
 *
 * @private function of useAgentChatHistoryClientState
 */
type UseAgentChatHistoryDraftStateResult = {
    readonly activeChatDraftMessage: string;
    readonly activeChatDraftMessageRef: { current: string };
    readonly activeDraftDirtyRef: { current: boolean };
    readonly isActiveDraftUserOwnedRef: { current: boolean };
    readonly setActiveChatDraftMessage: (draftMessage: string) => void;
    readonly flushActiveDraft: (options?: { keepalive?: boolean }) => Promise<void>;
    readonly handleDraftMessageChange: (draftMessage: string) => void;
};

/**
 * Keeps the active durable chat draft synchronized with local input, debounce persistence,
 * and page-lifecycle flushes.
 *
 * @private function of useAgentChatHistoryClientState
 */
export function useAgentChatHistoryDraftState({
    agentName,
    shouldUseHistory,
    activeChatIdRef,
    isOptimisticChatId,
}: UseAgentChatHistoryDraftStateProps): UseAgentChatHistoryDraftStateResult {
    const [activeChatDraftMessage, setActiveChatDraftMessage] = useState('');
    const activeChatDraftMessageRef = useRef('');
    const activeDraftDirtyRef = useRef(false);
    const isActiveDraftUserOwnedRef = useRef(false);
    const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        activeChatDraftMessageRef.current = activeChatDraftMessage;
    }, [activeChatDraftMessage]);

    useEffect(() => registerChatInputDraftOwnershipTracking(isActiveDraftUserOwnedRef), []);

    const flushActiveDraft = useCallback(
        async (options: { keepalive?: boolean } = {}): Promise<void> => {
            const currentActiveChatId = activeChatIdRef.current;
            if (
                !shouldUseHistory ||
                !currentActiveChatId ||
                isOptimisticChatId(currentActiveChatId) ||
                !activeDraftDirtyRef.current
            ) {
                return;
            }

            const draftValue = activeChatDraftMessageRef.current || null;
            if (draftSaveTimerRef.current) {
                clearTimeout(draftSaveTimerRef.current);
                draftSaveTimerRef.current = null;
            }

            await saveUserChatDraft(agentName, currentActiveChatId, draftValue, {
                keepalive: options.keepalive,
            });
            activeDraftDirtyRef.current = false;
        },
        [activeChatIdRef, agentName, isOptimisticChatId, shouldUseHistory],
    );

    useEffect(
        () =>
            registerDraftFlushLifecycle({
                shouldUseHistory,
                flushActiveDraft,
            }),
        [flushActiveDraft, shouldUseHistory],
    );

    const handleDraftMessageChange = useCallback(
        (draftMessage: string) => {
            if (!shouldUseHistory || !activeChatIdRef.current) {
                return;
            }

            setActiveChatDraftMessage(draftMessage);
            activeDraftDirtyRef.current = true;
            isActiveDraftUserOwnedRef.current = true;

            if (draftSaveTimerRef.current) {
                clearTimeout(draftSaveTimerRef.current);
            }

            draftSaveTimerRef.current = setTimeout(() => {
                void flushActiveDraft().catch((error) => {
                    notifyError(resolveErrorMessage(error, 'Failed to save chat draft.'));
                });
            }, SAVE_DEBOUNCE_MS);
        },
        [activeChatIdRef, flushActiveDraft, shouldUseHistory],
    );

    return {
        activeChatDraftMessage,
        activeChatDraftMessageRef,
        activeDraftDirtyRef,
        isActiveDraftUserOwnedRef,
        setActiveChatDraftMessage,
        flushActiveDraft,
        handleDraftMessageChange,
    };
}

/**
 * Starts tracking direct user interaction with the main chat composer.
 *
 * @private function of useAgentChatHistoryClientState
 */
function registerChatInputDraftOwnershipTracking(isActiveDraftUserOwnedRef: {
    current: boolean;
}): (() => void) | undefined {
    if (typeof document === 'undefined') {
        return undefined;
    }

    /**
     * Marks the active draft as user-owned when the main chat composer receives direct interaction.
     */
    const markDraftAsUserOwned = (event: Event): void => {
        const target = event.target;
        if (!(target instanceof HTMLTextAreaElement)) {
            return;
        }

        if (!target.classList.contains('chat-input-textarea')) {
            return;
        }

        isActiveDraftUserOwnedRef.current = true;
    };

    document.addEventListener('keydown', markDraftAsUserOwned, true);
    document.addEventListener('input', markDraftAsUserOwned, true);
    document.addEventListener('select', markDraftAsUserOwned, true);

    return () => {
        document.removeEventListener('keydown', markDraftAsUserOwned, true);
        document.removeEventListener('input', markDraftAsUserOwned, true);
        document.removeEventListener('select', markDraftAsUserOwned, true);
    };
}

/**
 * Persists the active draft on page lifecycle transitions.
 *
 * @private function of useAgentChatHistoryClientState
 */
function registerDraftFlushLifecycle(params: {
    shouldUseHistory: boolean;
    flushActiveDraft: (options?: { keepalive?: boolean }) => Promise<void>;
}): (() => void) | undefined {
    const { shouldUseHistory, flushActiveDraft } = params;

    if (!shouldUseHistory || typeof window === 'undefined') {
        return undefined;
    }

    const flushWithKeepalive = () => {
        void flushActiveDraft({ keepalive: true });
    };

    window.addEventListener('pagehide', flushWithKeepalive);
    window.addEventListener('beforeunload', flushWithKeepalive);

    return () => {
        window.removeEventListener('pagehide', flushWithKeepalive);
        window.removeEventListener('beforeunload', flushWithKeepalive);
        void flushActiveDraft();
    };
}

/**
 * Resolves one unknown error to a user-facing message.
 *
 * @private function of useAgentChatHistoryClientState
 */
function resolveErrorMessage(error: unknown, fallbackMessage: string): string {
    return error instanceof Error ? error.message : fallbackMessage;
}
