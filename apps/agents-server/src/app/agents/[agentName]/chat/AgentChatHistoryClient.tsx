'use client';

import type { ChatMessage } from '@promptbook-local/types';
import { AgentChatLoadingSkeleton } from '../../../../components/Skeleton/AgentChatLoadingSkeleton';
import { ChatThreadLoadingSkeleton } from '../../../../components/Skeleton/ChatThreadLoadingSkeleton';
import type { UserChatJob, UserChatSummary, UserChatTimeout } from '../../../../utils/userChatClient';
import { AgentChatWrapper } from '../AgentChatWrapper';
import { AgentChatPageLayout } from './AgentChatPageLayout';
import { AgentChatSidebar } from './AgentChatSidebar';
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
    formatText: (text: string) => string;
    autoExecuteMessage: string | undefined;
    autoExecuteMessageAttachments: ChatMessage['attachments'] | undefined;
    onAutoExecuteMessageConsumed: () => void;
};

/**
 * Props consumed by the history bootstrap loading view.
 */
type AgentChatHistoryLoadingViewProps = {
    isHeadlessMode: boolean;
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
                isHeadlessMode={isHeadlessMode}
                isSidebarCollapsed={isSidebarCollapsed}
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
            isSidebarCollapsed={isSidebarCollapsed}
            shouldShowExternalChats={shouldShowExternalChats}
            currentTimestamp={currentTimestamp}
            autoExecuteMessage={autoExecuteMessage}
            autoExecuteMessageAttachments={effectiveInitialAutoExecuteMessageAttachments}
            newChatHref={newChatHref}
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
                />
            </div>
        </div>
    );

    return guestChatContent;
}

/**
 * Renders the loading state shown while durable history bootstraps the first active chat.
 */
function AgentChatHistoryLoadingView(props: AgentChatHistoryLoadingViewProps) {
    const { isHeadlessMode, isSidebarCollapsed } = props;

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
        />
    );

    if (isHeadlessMode) {
        return <AgentChatPageLayout isHeadlessMode>{chatSurface}</AgentChatPageLayout>;
    }

    return <AgentChatPageLayout sidebar={chatSidebar}>{chatSurface}</AgentChatPageLayout>;
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
