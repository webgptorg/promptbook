'use client';

import type { ChatMessage } from '@promptbook-local/types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAgentNaming } from '../../../../components/AgentNaming/AgentNamingContext';
import { createMyChatsMobileMenuItem } from '../../../../components/Header/createMyChatsMobileMenuItem';
import { useHoistedMobileMenuItems } from '../../../../components/Header/MobileMenuHoistingContext';
import { usePrivateModePreferences } from '../../../../components/PrivateModePreferences/PrivateModePreferencesProvider';
import { useBrowserPushNotifications } from '../../../../components/PushNotifications/BrowserPushNotificationsProvider';
import { useServerLanguage } from '../../../../components/ServerLanguage/ServerLanguageProvider';
import { useActiveBrowserTab } from '../../../../hooks/useActiveBrowserTab';
import type { ServerLanguageCode } from '../../../../languages/ServerLanguageRegistry';
import type { ChatFeedbackMode } from '../../../../utils/chatFeedbackMode';
import { createServerLanguageMoment } from '../../../../utils/localization/createServerLanguageMoment';
import { consumeShareTargetPayloadFromBrowser } from '../../../../utils/shareTargetClient';
import type { UserChatJob, UserChatSummary, UserChatTimeout } from '../../../../utils/userChatClient';
import { FORCE_NEW_CHAT_QUERY_VALUE } from '../agentChatNavigationUtils';
import { clearPendingProfileMessage, peekPendingProfileMessage } from '../profileMessageCache';
import { mergeCanonicalChatMessagesWithPendingOutboundMessages } from './mergeCanonicalChatMessagesWithPendingOutboundMessages';
import { useAgentChatHistorySubmissionState } from './useAgentChatHistorySubmissionState';
import { useAgentChatHistorySyncState } from './useAgentChatHistorySyncState';
import { useChatDocumentTitle } from './useChatDocumentTitle';
import { usePendingOutboundMessages } from './usePendingOutboundMessages';

/**
 * Props for the full chat page with per-user durable history.
 *
 * @private type of AgentChatHistoryClient
 */
export type AgentChatHistoryClientProps = {
    agentName: string;
    agentTitle: string;
    agentUrl: string;
    brandColor?: string;
    inputPlaceholder: string | undefined;
    thinkingMessages?: ReadonlyArray<string>;
    speechRecognitionLanguage?: string;
    initialChatId?: string;
    initialAutoExecuteMessage?: string;
    initialAutoExecuteMessageAttachments?: ChatMessage['attachments'];
    initialShareTargetId?: string;
    initialForceNewChat?: boolean;
    initialAgentMessage?: string | null;
    isHistoryEnabled: boolean;
    isCurrentUserAdmin: boolean;
    areFileAttachmentsEnabled: boolean;
    feedbackMode: ChatFeedbackMode;
    isHeadlessMode?: boolean;
};

/**
 * Render-oriented state and handlers exposed by `useAgentChatHistoryClientState`.
 *
 * @private type of AgentChatHistoryClient
 */
type UseAgentChatHistoryClientStateResult = {
    formatText: (text: string) => string;
    shouldUseHistory: boolean;
    effectiveInitialAutoExecuteMessage: string | undefined;
    effectiveInitialAutoExecuteMessageAttachments: ChatMessage['attachments'] | undefined;
    effectiveInitialAutoExecuteClientMessageId: string | undefined;
    chats: Array<UserChatSummary>;
    activeChatId: string | null;
    activeChatSummary: UserChatSummary | null;
    activeChatDraftMessage: string;
    activeJobs: Array<UserChatJob>;
    activeTimeouts: Array<UserChatTimeout>;
    renderedActiveMessages: Array<ChatMessage>;
    isChatListLoading: boolean;
    isActiveChatLoading: boolean;
    isActiveChatReadOnly: boolean;
    isSidebarCollapsed: boolean;
    shouldShowExternalChats: boolean;
    currentTimestamp: number;
    autoExecuteMessage: string | undefined;
    newChatHref: string;
    untitledChatTitle: string;
    formatChatTimestamp: (timestamp: string) => string;
    handleSelectChatFromSidebar: (chatId: string) => void;
    handleDeleteChat: (chatId: string) => Promise<void>;
    handleShowExternalChatsChange: (nextValue: boolean) => void;
    toggleSidebarCollapsed: () => void;
    closeMobileSidebar: () => void;
    handleDraftMessageChange: (draftMessage: string) => void;
    handleSubmitUserTurn: (payload: {
        message: string;
        attachments?: ChatMessage['attachments'];
        parameters?: Record<string, unknown>;
        clientMessageId?: string;
        replyingTo?: ChatMessage['replyingTo'];
    }) => Promise<void>;
    handleCancelActiveJob: (jobId: string) => Promise<void>;
    handleCancelActiveTimeout: (timeoutId: string) => Promise<void>;
    handleAutoExecuteMessagePending: (payload: {
        chatId: string;
        clientMessageId: string;
        message: string;
        attachments?: ChatMessage['attachments'];
    }) => void;
    handleAutoExecuteMessageConsumed: () => void;
};

/**
 * Manages canonical chat-history state and user actions for `AgentChatHistoryClient`.
 *
 * @private function of AgentChatHistoryClient
 */
export function useAgentChatHistoryClientState(
    props: AgentChatHistoryClientProps,
): UseAgentChatHistoryClientStateResult {
    const {
        agentName,
        agentTitle,
        initialChatId,
        initialAutoExecuteMessage,
        initialAutoExecuteMessageAttachments,
        initialShareTargetId,
        initialForceNewChat = false,
        isHistoryEnabled,
        isCurrentUserAdmin,
        isHeadlessMode = false,
    } = props;
    const { formatText } = useAgentNaming();
    const { isPrivateModeEnabled } = usePrivateModePreferences();
    const { language, t } = useServerLanguage();
    const { maybePromptAfterUserMessageGesture, rememberDefaultOffHintShown, setFocusedChat, setNotificationsEnabled } =
        useBrowserPushNotifications();
    const isActiveBrowserTab = useActiveBrowserTab();
    const shouldUseHistory = isHistoryEnabled && !isPrivateModeEnabled;
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
    const [showExternalChats, setShowExternalChats] = useState(false);
    const newChatHref = useMemo(() => {
        const params = new URLSearchParams();
        params.set('chat', FORCE_NEW_CHAT_QUERY_VALUE);

        if (isHeadlessMode) {
            params.set('headless', '');
        }

        return `/agents/${encodeURIComponent(agentName)}/chat?${params.toString()}`;
    }, [agentName, isHeadlessMode]);
    const pendingProfileMessage = useMemo(() => peekPendingProfileMessage(agentName), [agentName]);
    const effectiveInitialAutoExecuteMessage = initialAutoExecuteMessage ?? pendingProfileMessage?.message;
    const effectiveInitialAutoExecuteMessageAttachments =
        initialAutoExecuteMessageAttachments ?? pendingProfileMessage?.attachments;
    const effectiveInitialAutoExecuteClientMessageId = pendingProfileMessage?.clientMessageId;
    const hasInitialAutoExecutePayload = hasAutoExecutePayload(
        effectiveInitialAutoExecuteMessage,
        effectiveInitialAutoExecuteMessageAttachments,
    );
    const hasInitialAutoMessageBeenConsumedRef = useRef(false);
    const autoExecuteTargetChatIdRef = useRef<string | undefined>(initialForceNewChat ? undefined : initialChatId);
    const shareTargetIdRef = useRef<string | undefined>(initialShareTargetId);

    useEffect(() => {
        if (!pendingProfileMessage) {
            return;
        }

        clearPendingProfileMessage(agentName);
    }, [agentName, pendingProfileMessage]);

    const shouldShowExternalChats = isCurrentUserAdmin && showExternalChats;
    const {
        chats,
        activeChatId,
        activeChatSummary,
        activeChatDraftMessage,
        activeMessages,
        activeJobs,
        activeTimeouts,
        isChatListLoading,
        isActiveChatLoading,
        isActiveChatReadOnly,
        currentTimestamp,
        activeChatIdRef,
        activeDraftDirtyRef,
        isActiveDraftUserOwnedRef,
        setActiveChatDraftMessage,
        handleCreateChat,
        handleDeleteChat,
        handleDraftMessageChange,
        handleCancelActiveJob,
        handleCancelActiveTimeout,
        resolveDurableChatId,
        resolveFailedSendRecord,
        rememberFailedSendRecord,
        clearFailedSendRecord,
        reassignFailedSendRecordsToChatId,
        applyChatDetail,
        handleSelectChatFromSidebar: handleSelectChatFromSidebarBase,
    } = useAgentChatHistorySyncState({
        agentName,
        formatText,
        shouldUseHistory,
        shouldShowExternalChats,
        initialChatId,
        initialForceNewChat,
        hasInitialAutoExecutePayload,
        effectiveInitialAutoExecuteMessage,
        hasInitialAutoMessageBeenConsumedRef,
        isHeadlessMode,
        initialShareTargetId,
        autoExecuteTargetChatIdRef,
        shareTargetIdRef,
        isActiveBrowserTab,
        setFocusedChat,
    });
    const pendingOutboundMessages = usePendingOutboundMessages(activeChatId);
    const renderedActiveMessages = useMemo(
        () =>
            mergeCanonicalChatMessagesWithPendingOutboundMessages({
                canonicalMessages: activeMessages,
                pendingOutboundMessages,
            }),
        [activeMessages, pendingOutboundMessages],
    );
    const untitledChatTitle = formatText('New chat');
    useChatDocumentTitle({
        agentTitle,
        activeChatTitle: activeChatSummary?.title,
        untitledChatTitle,
    });
    const { handleAutoExecuteMessagePending, handleSubmitUserTurn } = useAgentChatHistorySubmissionState({
        agentName,
        shouldUseHistory,
        activeMessages,
        activeChatIdRef,
        activeDraftDirtyRef,
        isActiveDraftUserOwnedRef,
        setActiveChatDraftMessage,
        applyChatDetail,
        resolveDurableChatId,
        resolveFailedSendRecord,
        rememberFailedSendRecord,
        clearFailedSendRecord,
        reassignFailedSendRecordsToChatId,
        maybePromptAfterUserMessageGesture,
        rememberDefaultOffHintShown,
        setNotificationsEnabled,
        t,
    });
    const toggleSidebarCollapsed = useCallback(() => {
        setIsSidebarCollapsed((value) => !value);
    }, []);
    const closeMobileSidebar = useCallback(() => undefined, []);
    const handleSelectChatFromSidebar = useCallback(
        (chatId: string) => {
            handleSelectChatFromSidebarBase(chatId);
            closeMobileSidebar();
        },
        [closeMobileSidebar, handleSelectChatFromSidebarBase],
    );
    const handleShowExternalChatsChange = useCallback((nextValue: boolean) => {
        setShowExternalChats(nextValue);
    }, []);
    const handleAutoExecuteMessageConsumed = useCallback(() => {
        hasInitialAutoMessageBeenConsumedRef.current = true;
        const consumedShareTargetId = shareTargetIdRef.current;
        shareTargetIdRef.current = undefined;

        if (consumedShareTargetId) {
            void consumeShareTargetPayloadFromBrowser(agentName, consumedShareTargetId).catch(() => undefined);
        }

        if (typeof window === 'undefined') {
            return;
        }

        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.delete('message');
        nextUrl.searchParams.delete('shareTarget');
        window.history.replaceState(window.history.state, '', `${nextUrl.pathname}${nextUrl.search}`);
    }, [agentName]);

    const autoMessageTargetId = autoExecuteTargetChatIdRef.current;
    const shouldAutoExecuteCurrentChat =
        !hasInitialAutoMessageBeenConsumedRef.current &&
        hasInitialAutoExecutePayload &&
        Boolean(activeChatId) &&
        !isActiveChatReadOnly &&
        (!autoMessageTargetId || autoMessageTargetId === activeChatId);
    const autoExecuteMessage = shouldAutoExecuteCurrentChat ? effectiveInitialAutoExecuteMessage ?? '' : undefined;
    const hoistedMobileMenuItems = useMemo(
        () =>
            shouldUseHistory && !isHeadlessMode
                ? [
                      createMyChatsMobileMenuItem({
                          formatText,
                          chats,
                          activeChatId,
                          onSelectChat: handleSelectChatFromSidebar,
                          onCreateChat: () => {
                              void handleCreateChat();
                          },
                      }),
                  ]
                : [],
        [
            activeChatId,
            chats,
            formatText,
            handleCreateChat,
            handleSelectChatFromSidebar,
            isHeadlessMode,
            shouldUseHistory,
        ],
    );
    useHoistedMobileMenuItems(hoistedMobileMenuItems);

    const formatChatTimestamp = useCallback(
        (timestamp: string): string => formatRelativeChatTimestamp(timestamp, language),
        [language],
    );

    return {
        formatText,
        shouldUseHistory,
        effectiveInitialAutoExecuteMessage,
        effectiveInitialAutoExecuteMessageAttachments,
        effectiveInitialAutoExecuteClientMessageId,
        chats,
        activeChatId,
        activeChatSummary,
        activeChatDraftMessage,
        activeJobs,
        activeTimeouts,
        renderedActiveMessages,
        isChatListLoading,
        isActiveChatLoading,
        isActiveChatReadOnly,
        isSidebarCollapsed,
        shouldShowExternalChats,
        currentTimestamp,
        autoExecuteMessage,
        newChatHref,
        untitledChatTitle,
        formatChatTimestamp,
        handleSelectChatFromSidebar,
        handleDeleteChat,
        handleShowExternalChatsChange,
        toggleSidebarCollapsed,
        closeMobileSidebar,
        handleDraftMessageChange,
        handleSubmitUserTurn,
        handleCancelActiveJob,
        handleCancelActiveTimeout,
        handleAutoExecuteMessagePending,
        handleAutoExecuteMessageConsumed,
    };
}

/**
 * Returns true when one initial auto-execute payload contains a message or attachments.
 */
function hasAutoExecutePayload(
    message: string | undefined,
    attachments: ChatMessage['attachments'] | undefined,
): boolean {
    return Boolean(message) || Boolean(attachments?.length);
}

/**
 * Formats one chat timestamp into relative text using the active server language.
 */
function formatRelativeChatTimestamp(timestamp: string, language: ServerLanguageCode): string {
    const parsed = createServerLanguageMoment(timestamp, language);
    if (!parsed.isValid()) {
        return timestamp;
    }

    return parsed.fromNow();
}
