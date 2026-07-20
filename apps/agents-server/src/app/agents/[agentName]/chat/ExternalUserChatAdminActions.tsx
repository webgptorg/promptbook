'use client';

import type { ChatMessage } from '@promptbook-local/types';
import { useCallback, useState } from 'react';
import { notifyError, notifySuccess } from '../../../../components/Notifications/notifications';
import {
    $saveMockedChatPresetFromMessages,
    MOCKED_CHATS_EDITOR_ROUTE,
} from '../../../../utils/mockedChats/$saveMockedChatPresetFromMessages';

/**
 * Route of the admin chat-history page linked from the external-chat view.
 *
 * @private constant of <ExternalUserChatAdminActions/>
 */
const ADMIN_CHAT_HISTORY_ROUTE = '/admin/chat-history';

/**
 * Builds the admin chat-history link pointing at the most detailed view of one chat.
 *
 * When the agent and chat thread are known the link opens the recorded conversation
 * directly (chat view of that thread) instead of the mixed chat-history pile.
 *
 * @private utility of <ExternalUserChatAdminActions/>
 */
function buildAdminChatHistoryHref(agentName: string, chatId: string): string {
    const params = new URLSearchParams();

    if (agentName) {
        params.set('agentName', agentName);
    }

    if (chatId) {
        params.set('chatId', chatId);
        params.set('view', 'chat');
    }

    const qs = params.toString();
    return qs ? `${ADMIN_CHAT_HISTORY_ROUTE}?${qs}` : ADMIN_CHAT_HISTORY_ROUTE;
}

/**
 * Props for the super-admin actions shown on external users' chats.
 *
 * @private component of <AgentChatHistoryClient/>
 */
type ExternalUserChatAdminActionsProps = {
    /**
     * Name of the agent owning the viewed chat, used to deep-link the chat history.
     */
    readonly agentName: string;
    /**
     * Canonical id of the viewed chat, used to deep-link the recorded conversation.
     */
    readonly chatId: string;
    /**
     * Title of the viewed chat used as the mocked-chat preset name.
     */
    readonly chatTitle: string;
    /**
     * Messages of the viewed chat used to build the mocked-chat preset.
     */
    readonly messages: ReadonlyArray<ChatMessage>;
};

/**
 * Super-admin quick actions rendered inside the frozen banner of external users' chats:
 * create a mocked chat from the conversation and jump to the admin chat history.
 *
 * @private component of <AgentChatHistoryClient/>
 */
export function ExternalUserChatAdminActions({
    agentName,
    chatId,
    chatTitle,
    messages,
}: ExternalUserChatAdminActionsProps) {
    const [isCreatingMock, setIsCreatingMock] = useState(false);
    const adminChatHistoryHref = buildAdminChatHistoryHref(agentName, chatId);

    const handleCreateMock = useCallback(async () => {
        if (isCreatingMock) {
            return;
        }

        try {
            setIsCreatingMock(true);
            await $saveMockedChatPresetFromMessages({
                name: chatTitle,
                messages: messages.map((message) => ({
                    sender: String(message.sender || ''),
                    content: typeof message.content === 'string' ? message.content : '',
                    createdAt: message.createdAt || null,
                })),
            });
            notifySuccess('Mocked chat was created.');
            window.location.href = MOCKED_CHATS_EDITOR_ROUTE;
        } catch (error) {
            notifyError(error instanceof Error ? error.message : 'Failed to create the mocked chat.');
        } finally {
            setIsCreatingMock(false);
        }
    }, [chatTitle, isCreatingMock, messages]);

    return (
        <span className="ml-2 inline-flex flex-wrap items-center gap-2 align-middle">
            <button
                type="button"
                onClick={() => void handleCreateMock()}
                disabled={isCreatingMock}
                className="rounded-full border border-amber-300 bg-white/80 px-3 py-1 text-xs font-semibold text-amber-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-500/40 dark:bg-transparent dark:text-amber-100"
                title="Create a mocked chat preset from this conversation"
            >
                {isCreatingMock ? 'Creating mock…' : 'Create mock'}
            </button>
            <a
                href={adminChatHistoryHref}
                className="rounded-full border border-amber-300 bg-white/80 px-3 py-1 text-xs font-semibold text-amber-900 hover:bg-white dark:border-amber-500/40 dark:bg-transparent dark:text-amber-100"
                title="Open the admin chat history"
            >
                Chat history
            </a>
        </span>
    );
}
