'use client';

import type { ChatMessage } from '@promptbook-local/types';
import { MessageSquarePlusIcon } from 'lucide-react';
import { AgentChatLoadingSkeleton } from '../../../../components/Skeleton/AgentChatLoadingSkeleton';
import { ChatThreadLoadingSkeleton } from '../../../../components/Skeleton/ChatThreadLoadingSkeleton';
import type { UserChatJob, UserChatSummary, UserChatTimeout } from '../../../../utils/userChatClient';
import { AgentChatWrapper } from '../AgentChatWrapper';
import { AgentChatPageLayout } from './AgentChatPageLayout';
import { AgentChatSidebar } from './AgentChatSidebar';
import type { AgentChatLayoutVariant } from './AgentChatLayoutVariant';
import { CanonicalAgentChatPanel } from './CanonicalAgentChatPanel';
import { type AgentChatHistoryClientProps, useAgentChatHistoryClientState } from './useAgentChatHistoryClientState';

/**
 * One user-authored chat turn submitted from the canonical chat panel.
 */
type ChatHistoryUserTurnPayload = {
    message: string;
    attachments?: ChatMessage['attachments'];
    parameters?: Record<string, unknown>;
    clientMessageId?: string;
    replyingTo?: ChatMessage['replyingTo'];
};

/**
 * Props consumed by the history-disabled guest-chat view.
 */
type AgentChatHistoryPrivateModeViewProps = Pick<
    AgentChatHistoryClientProps,
    | 'agentName'
    | 'agentUrl'
    | 'brandColor'
    | 'inputPlaceholder'
    | 'thinkingMessages'
    | 'speechRecognitionLanguage'
    | 'areFileAttachmentsEnabled'
    | 'feedbackMode'
> & {
    layoutVariant: AgentChatLayoutVariant;
    isHeadlessMode: boolean;
    formatText: (text: string) => string;
    autoExecuteMessage: string | undefined;
    autoExecuteMessageAttachments: ChatMessage['attachments'] | undefined;
    onAutoExecuteMessageConsumed: () => void;
};

/**
 * Props consumed by the history bootstrap loading view.
 */
type AgentChatHistoryLoadingViewProps = {
    layoutVariant: AgentChatLayoutVariant;
    isHeadlessMode: boolean;
    isChatGptLikeLayout: boolean;
    isSidebarCollapsed: boolean;
};

/**
 * Props consumed by the ready-to-render durable history view.
 */
type AgentChatHistoryReadyViewProps = Pick<
    AgentChatHistoryClientProps,
    | 'agentName'
    | 'agentUrl'
    | 'brandColor'
    | 'inputPlaceholder'
    | 'thinkingMessages'
    | 'speechRecognitionLanguage'
    | 'initialAgentMessage'
    | 'areFileAttachmentsEnabled'
    | 'feedbackMode'
    | 'isCurrentUserAdmin'
> & {
    layoutVariant: AgentChatLayoutVariant;
    isHeadlessMode: boolean;
    activeChatId: string;
    chats: ReadonlyArray<UserChatSummary>;
    activeChatSummary: UserChatSummary | null;
    renderedActiveMessages: ReadonlyArray<ChatMessage>;
    activeChatDraftMessage: string;
    activeJobs: ReadonlyArray<UserChatJob>;
    activeTimeouts: ReadonlyArray<UserChatTimeout>;
    isChatListLoading: boolean;
    isActiveChatLoading: boolean;
    isActiveChatReadOnly: boolean;
    isSidebarCollapsed: boolean;
    shouldShowExternalChats: boolean;
    currentTimestamp: number;
    autoExecuteMessage: string | undefined;
    autoExecuteMessageAttachments: ChatMessage['attachments'] | undefined;
    newChatHref: string;
    untitledChatTitle: string;
    formatText: (text: string) => string;
    formatChatTimestamp: (timestamp: string) => string;
    onSelectChat: (chatId: string) => void;
    onDeleteChat: (chatId: string) => Promise<void>;
    onShowExternalChatsChange: (nextValue: boolean) => void;
    onToggleSidebar: () => void;
    onCloseMobileSidebar: () => void;
    onDraftMessageChange: (draftMessage: string) => void;
    onSubmitUserTurn: (payload: ChatHistoryUserTurnPayload) => Promise<void>;
    onCancelActiveJob: (jobId: string) => Promise<void>;
    onCancelActiveTimeout: (timeoutId: string) => Promise<void>;
    onAutoExecuteMessagePending: (payload: {
        chatId: string;
        clientMessageId: string;
        message: string;
        attachments?: ChatMessage['attachments'];
    }) => void;
    onAutoExecuteMessageConsumed: () => void;
};

/**
 * Full chat page client with canonical server-owned conversation state.
 */
export function AgentChatHistoryClient(props: AgentChatHistoryClientProps) {
    const {
        agentName,
        agentUrl,
        brandColor,
        inputPlaceholder,
        thinkingMessages,
        speechRecognitionLanguage,
        initialAgentMessage,
        isCurrentUserAdmin,
        areFileAttachmentsEnabled,
        feedbackMode,
        isHeadlessMode = false,
        layoutVariant = 'default',
    } = props;
    const {
        formatText,
        shouldUseHistory,
        effectiveInitialAutoExecuteMessage,
        effectiveInitialAutoExecuteMessageAttachments,
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
    } = useAgentChatHistoryClientState(props);
    const isChatGptLikeLayout = layoutVariant === 'chatgptLike';
    const effectiveIsSidebarCollapsed = isChatGptLikeLayout ? false : isSidebarCollapsed;

    if (!shouldUseHistory) {
        return (
            <AgentChatHistoryPrivateModeView
                agentName={agentName}
                agentUrl={agentUrl}
                brandColor={brandColor}
                inputPlaceholder={inputPlaceholder}
                thinkingMessages={thinkingMessages}
                speechRecognitionLanguage={speechRecognitionLanguage}
                areFileAttachmentsEnabled={areFileAttachmentsEnabled}
                feedbackMode={feedbackMode}
                layoutVariant={layoutVariant}
                isHeadlessMode={isHeadlessMode}
                formatText={formatText}
                autoExecuteMessage={effectiveInitialAutoExecuteMessage}
                autoExecuteMessageAttachments={effectiveInitialAutoExecuteMessageAttachments}
                onAutoExecuteMessageConsumed={handleAutoExecuteMessageConsumed}
            />
        );
    }

    if (!activeChatId) {
        return (
            <AgentChatHistoryLoadingView
                layoutVariant={layoutVariant}
                isHeadlessMode={isHeadlessMode}
                isChatGptLikeLayout={isChatGptLikeLayout}
                isSidebarCollapsed={effectiveIsSidebarCollapsed}
            />
        );
    }

    return (
        <AgentChatHistoryReadyView
            agentName={agentName}
            agentUrl={agentUrl}
            brandColor={brandColor}
            inputPlaceholder={inputPlaceholder}
            thinkingMessages={thinkingMessages}
            speechRecognitionLanguage={speechRecognitionLanguage}
            initialAgentMessage={initialAgentMessage}
            areFileAttachmentsEnabled={areFileAttachmentsEnabled}
            feedbackMode={feedbackMode}
            isCurrentUserAdmin={isCurrentUserAdmin}
            layoutVariant={layoutVariant}
            isHeadlessMode={isHeadlessMode}
            activeChatId={activeChatId}
            chats={chats}
            activeChatSummary={activeChatSummary}
            renderedActiveMessages={renderedActiveMessages}
            activeChatDraftMessage={activeChatDraftMessage}
            activeJobs={activeJobs}
            activeTimeouts={activeTimeouts}
            isChatListLoading={isChatListLoading}
            isActiveChatLoading={isActiveChatLoading}
            isActiveChatReadOnly={isActiveChatReadOnly}
            isSidebarCollapsed={effectiveIsSidebarCollapsed}
            shouldShowExternalChats={shouldShowExternalChats}
            currentTimestamp={currentTimestamp}
            autoExecuteMessage={autoExecuteMessage}
            autoExecuteMessageAttachments={effectiveInitialAutoExecuteMessageAttachments}
            newChatHref={newChatHref}
            untitledChatTitle={untitledChatTitle}
            formatText={formatText}
            formatChatTimestamp={formatChatTimestamp}
            onSelectChat={handleSelectChatFromSidebar}
            onDeleteChat={handleDeleteChat}
            onShowExternalChatsChange={handleShowExternalChatsChange}
            onToggleSidebar={toggleSidebarCollapsed}
            onCloseMobileSidebar={closeMobileSidebar}
            onDraftMessageChange={handleDraftMessageChange}
            onSubmitUserTurn={handleSubmitUserTurn}
            onCancelActiveJob={handleCancelActiveJob}
            onCancelActiveTimeout={handleCancelActiveTimeout}
            onAutoExecuteMessagePending={handleAutoExecuteMessagePending}
            onAutoExecuteMessageConsumed={handleAutoExecuteMessageConsumed}
        />
    );
}

/**
 * Renders the guest-chat surface when private mode disables durable history.
 */
function AgentChatHistoryPrivateModeView(props: AgentChatHistoryPrivateModeViewProps) {
    const {
        agentName,
        agentUrl,
        brandColor,
        inputPlaceholder,
        thinkingMessages,
        speechRecognitionLanguage,
        areFileAttachmentsEnabled,
        feedbackMode,
        layoutVariant,
        isHeadlessMode,
        formatText,
        autoExecuteMessage,
        autoExecuteMessageAttachments,
        onAutoExecuteMessageConsumed,
    } = props;
    const guestChatContent = (
        <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
            <PrivateModeHistoryBanner formatText={formatText} />
            <div className="flex min-h-0 flex-1 overflow-hidden">
                <AgentChatWrapper
                    key={`guest-${agentName}`}
                    agentName={agentName}
                    agentUrl={agentUrl}
                    autoExecuteMessage={autoExecuteMessage}
                    autoExecuteMessageAttachments={autoExecuteMessageAttachments}
                    brandColor={brandColor}
                    inputPlaceholder={inputPlaceholder}
                    thinkingMessages={thinkingMessages}
                    speechRecognitionLanguage={speechRecognitionLanguage}
                    persistenceKey={`guest-chat-${encodeURIComponent(agentName)}`}
                    areFileAttachmentsEnabled={areFileAttachmentsEnabled}
                    feedbackMode={feedbackMode}
                    onAutoExecuteMessageConsumed={onAutoExecuteMessageConsumed}
                    layoutVariant={layoutVariant}
                />
            </div>
        </div>
    );

    if (layoutVariant === 'chatgptLike') {
        return (
            <AgentChatPageLayout variant={layoutVariant} isHeadlessMode={isHeadlessMode}>
                {guestChatContent}
            </AgentChatPageLayout>
        );
    }

    return guestChatContent;
}

/**
 * Renders the loading state shown while durable history bootstraps the first active chat.
 */
function AgentChatHistoryLoadingView(props: AgentChatHistoryLoadingViewProps) {
    const { layoutVariant, isHeadlessMode, isChatGptLikeLayout, isSidebarCollapsed } = props;

    if (isChatGptLikeLayout) {
        return (
            <AgentChatPageLayout variant={layoutVariant} isHeadlessMode={isHeadlessMode}>
                <AgentChatLoadingSkeleton showSidebar={!isHeadlessMode} isSidebarCollapsed={false} />
            </AgentChatPageLayout>
        );
    }

    return <AgentChatLoadingSkeleton showSidebar={!isHeadlessMode} isSidebarCollapsed={isSidebarCollapsed} />;
}

/**
 * Renders the full durable-chat history layout once one active chat is available.
 */
function AgentChatHistoryReadyView(props: AgentChatHistoryReadyViewProps) {
    const {
        agentName,
        agentUrl,
        brandColor,
        inputPlaceholder,
        thinkingMessages,
        speechRecognitionLanguage,
        initialAgentMessage,
        areFileAttachmentsEnabled,
        feedbackMode,
        isCurrentUserAdmin,
        layoutVariant,
        isHeadlessMode,
        activeChatId,
        chats,
        activeChatSummary,
        renderedActiveMessages,
        activeChatDraftMessage,
        activeJobs,
        activeTimeouts,
        isChatListLoading,
        isActiveChatLoading,
        isActiveChatReadOnly,
        isSidebarCollapsed,
        shouldShowExternalChats,
        currentTimestamp,
        autoExecuteMessage,
        autoExecuteMessageAttachments,
        newChatHref,
        untitledChatTitle,
        formatText,
        formatChatTimestamp,
        onSelectChat,
        onDeleteChat,
        onShowExternalChatsChange,
        onToggleSidebar,
        onCloseMobileSidebar,
        onDraftMessageChange,
        onSubmitUserTurn,
        onCancelActiveJob,
        onCancelActiveTimeout,
        onAutoExecuteMessagePending,
        onAutoExecuteMessageConsumed,
    } = props;
    const isChatGptLikeLayout = layoutVariant === 'chatgptLike';
    const chatSurface = (
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
            {isActiveChatLoading ? (
                <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-white/30 bg-white/70 backdrop-blur-sm">
                    <ChatThreadLoadingSkeleton />
                </div>
            ) : (
                <CanonicalAgentChatPanel
                    chatId={activeChatId}
                    agentName={agentName}
                    agentUrl={agentUrl}
                    brandColor={brandColor}
                    inputPlaceholder={inputPlaceholder}
                    thinkingMessages={thinkingMessages}
                    speechRecognitionLanguage={speechRecognitionLanguage}
                    initialAgentMessage={initialAgentMessage}
                    isReadOnly={isActiveChatReadOnly}
                    readOnlySource={activeChatSummary?.source}
                    messages={renderedActiveMessages}
                    draftMessage={isActiveChatReadOnly ? '' : activeChatDraftMessage}
                    autoExecuteMessage={autoExecuteMessage}
                    autoExecuteMessageAttachments={autoExecuteMessageAttachments}
                    areFileAttachmentsEnabled={areFileAttachmentsEnabled}
                    feedbackMode={feedbackMode}
                    activeJobs={activeJobs}
                    activeTimeouts={activeTimeouts}
                    currentTimestamp={currentTimestamp}
                    onDraftMessageChange={onDraftMessageChange}
                    onSubmitUserTurn={onSubmitUserTurn}
                    newChatButtonHref={isActiveChatReadOnly ? undefined : newChatHref}
                    onCancelActiveJob={isActiveChatReadOnly ? undefined : onCancelActiveJob}
                    onCancelActiveTimeout={isActiveChatReadOnly ? undefined : onCancelActiveTimeout}
                    onAutoExecuteMessagePending={onAutoExecuteMessagePending}
                    onAutoExecuteMessageConsumed={onAutoExecuteMessageConsumed}
                    variant={layoutVariant}
                />
            )}
        </div>
    );
    const chatSidebar = (
        <AgentChatSidebar
            chats={chats}
            activeChatId={activeChatId}
            isLoadingChats={isChatListLoading}
            formatText={formatText}
            formatChatTimestamp={formatChatTimestamp}
            currentTimestamp={currentTimestamp}
            onSelectChat={onSelectChat}
            onDeleteChat={onDeleteChat}
            newChatHref={newChatHref}
            isAdmin={isCurrentUserAdmin}
            showExternalChats={shouldShowExternalChats}
            onShowExternalChatsChange={onShowExternalChatsChange}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={onToggleSidebar}
            isMobileSidebarOpen={false}
            onCloseMobileSidebar={onCloseMobileSidebar}
            variant={layoutVariant}
        />
    );

    if (!isChatGptLikeLayout) {
        if (isHeadlessMode) {
            return (
                <AgentChatPageLayout variant={layoutVariant} isHeadlessMode>
                    {chatSurface}
                </AgentChatPageLayout>
            );
        }

        return (
            <AgentChatPageLayout variant={layoutVariant} sidebar={chatSidebar}>
                {chatSurface}
            </AgentChatPageLayout>
        );
    }

    return (
        <AgentChatPageLayout
            variant={layoutVariant}
            isHeadlessMode={isHeadlessMode}
            sidebar={isHeadlessMode ? undefined : chatSidebar}
            mainTopBar={
                isHeadlessMode ? undefined : (
                    <AgentChatHistoryChatGptLikeTopBar
                        activeChatTitle={activeChatSummary?.title || untitledChatTitle}
                        formatText={formatText}
                        newChatHref={newChatHref}
                    />
                )
            }
        >
            {chatSurface}
        </AgentChatPageLayout>
    );
}

/**
 * Renders the compact ChatGPT-like mobile top bar for the durable history view.
 */
function AgentChatHistoryChatGptLikeTopBar(props: {
    activeChatTitle: string;
    formatText: (text: string) => string;
    newChatHref: string;
}) {
    const { activeChatTitle, formatText, newChatHref } = props;

    return (
        <div className="agent-chat-chatgpt-like-mobile-header flex items-center justify-between gap-3 px-3.5 py-2.5 md:hidden">
            <span
                aria-hidden="true"
                className="agent-chat-chatgpt-like-mobile-header__icon-button inline-flex h-9 w-9 items-center justify-center rounded-lg border opacity-0"
            />
            <div className="min-w-0 flex-1 text-center">
                <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{activeChatTitle}</div>
                <div className="truncate text-[11px] uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
                    {formatText('ChatGPT-like')}
                </div>
            </div>
            <a
                href={newChatHref}
                className="agent-chat-chatgpt-like-mobile-header__icon-button inline-flex h-9 w-9 items-center justify-center rounded-lg border transition"
                aria-label={formatText('New chat')}
            >
                <MessageSquarePlusIcon className="h-4 w-4" />
            </a>
        </div>
    );
}

/**
 * Displays private mode notice when history persistence is disabled.
 */
function PrivateModeHistoryBanner({ formatText }: { formatText: (text: string) => string }) {
    return (
        <div className="border-b border-blue-100 bg-blue-50 px-4 py-2 text-center text-xs font-semibold uppercase tracking-[0.3em] text-blue-700">
            {formatText('Private mode is on. Chat history, memories, and learning are disabled.')}
        </div>
    );
}
