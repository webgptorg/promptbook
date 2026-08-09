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
 * Route of one admin user detail page linked from the external-chat view.
 *
 * @private constant of <ExternalUserChatAdminActions/>
 */
const ADMIN_USERS_ROUTE = '/admin/users';

/**
 * Builds the admin chat-history link pointing at the most detailed view of one chat.
 *
 * When the agent and chat thread are known the link opens the recorded conversation
 * directly (chat view of that thread) instead of the mixed chat-history pile.
 *
 * @private utility of <ExternalUserChatAdminActions/>
 */
function buildAdminChatHistoryHref(agentName: string, chatId: string, userId: number | undefined): string {
    const params = new URLSearchParams();

    if (agentName) {
        params.set('agentName', agentName);
    }

    if (isValidUserId(userId)) {
        params.set('userId', String(userId));
    }

    if (chatId) {
        params.set('chatId', chatId);
        params.set('view', 'chat');
    }

    const qs = params.toString();
    return qs ? `${ADMIN_CHAT_HISTORY_ROUTE}?${qs}` : ADMIN_CHAT_HISTORY_ROUTE;
}

/**
 * Builds the user detail link for a valid chat owner id.
 *
 * @private utility of <ExternalUserChatAdminActions/>
 */
function buildAdminUserHref(userId: number | undefined): string | null {
    if (!isValidUserId(userId)) {
        return null;
    }

    return `${ADMIN_USERS_ROUTE}/${encodeURIComponent(String(userId))}`;
}

/**
 * Returns whether a value can identify one persisted user.
 *
 * @private utility of <ExternalUserChatAdminActions/>
 */
function isValidUserId(userId: number | undefined): userId is number {
    return typeof userId === 'number' && Number.isSafeInteger(userId) && userId > 0;
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
     * Database user id of the person who owns the viewed chat.
     */
    readonly userId?: number;
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
 * create a mocked chat from the conversation, open its owner profile, and jump to the admin chat history.
 *
 * @private component of <AgentChatHistoryClient/>
 */
export function ExternalUserChatAdminActions({
    agentName,
    chatId,
    userId,
    chatTitle,
    messages,
}: ExternalUserChatAdminActionsProps) {
    const [isCreatingMock, setIsCreatingMock] = useState(false);
    const adminChatHistoryHref = buildAdminChatHistoryHref(agentName, chatId, userId);
    const adminUserHref = buildAdminUserHref(userId);

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
            {adminUserHref && (
                <a
                    href={adminUserHref}
                    className="rounded-full border border-amber-300 bg-white/80 px-3 py-1 text-xs font-semibold text-amber-900 hover:bg-white dark:border-amber-500/40 dark:bg-transparent dark:text-amber-100"
                    title="Open the profile of the user who created this chat"
                >
                    User #{userId}
                </a>
            )}
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
