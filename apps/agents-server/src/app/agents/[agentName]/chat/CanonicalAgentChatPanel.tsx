'use client';

import { WalletRecordDialog } from '@/src/components/WalletRecordDialog/WalletRecordDialog';
import type { ChatMessage } from '@promptbook-local/types';
import { type ReactNode } from 'react';
import { type ChatFeedbackMode } from '../../../../utils/chatFeedbackMode';
import { type UserChatSource } from '../../../../utils/userChat/UserChatSource';
import type { UserChatJob, UserChatTimeout } from '../../../../utils/userChatClient';
import { MetaDisclaimerDialog } from '../MetaDisclaimerDialog';
import { PseudoUserChatDialog } from '../PseudoUserChatDialog';
import type { AgentChatLayoutVariant } from './AgentChatLayoutVariant';
import { CanonicalAgentChatSurface } from './CanonicalAgentChatSurface';
import { useCanonicalAgentChatPanelState } from './useCanonicalAgentChatPanelState';

/**
 * Props accepted by the canonical server-backed chat panel.
 */
type CanonicalAgentChatPanelProps = {
    chatId: string;
    agentName: string;
    agentUrl: string;
    brandColor?: string;
    inputPlaceholder: string | undefined;
    thinkingMessages?: ReadonlyArray<string>;
    speechRecognitionLanguage?: string;
    initialAgentMessage?: string | null;
    isReadOnly?: boolean;
    readOnlySource?: UserChatSource;
    messages: ReadonlyArray<ChatMessage>;
    draftMessage?: string;
    autoExecuteMessage?: string;
    autoExecuteMessageAttachments?: ChatMessage['attachments'];
    areFileAttachmentsEnabled: boolean;
    feedbackMode: ChatFeedbackMode;
    activeJobs: ReadonlyArray<UserChatJob>;
    activeTimeouts: ReadonlyArray<UserChatTimeout>;
    currentTimestamp: number;
    onDraftMessageChange: (message: string) => void;
    onSubmitUserTurn: (payload: {
        message: string;
        attachments?: ChatMessage['attachments'];
        parameters?: Record<string, unknown>;
        clientMessageId?: string;
        replyingTo?: ChatMessage['replyingTo'];
    }) => Promise<void>;
    onStartNewChat?: () => Promise<void> | void;
    newChatButtonHref?: string;
    onCancelActiveJob?: (jobId: string) => Promise<void> | void;
    onCancelActiveTimeout?: (timeoutId: string) => Promise<void> | void;
    onAutoExecuteMessagePending?: (payload: {
        chatId: string;
        clientMessageId: string;
        message: string;
        attachments?: ChatMessage['attachments'];
    }) => void;
    onAutoExecuteMessageConsumed?: () => void;
    extraActions?: ReactNode;
    variant?: AgentChatLayoutVariant;
};

/**
 * Renders the full canonical chat surface while delegating message execution to the server.
 */
export function CanonicalAgentChatPanel(props: CanonicalAgentChatPanelProps) {
    const {
        chatId,
        agentName,
        agentUrl,
        brandColor,
        inputPlaceholder,
        thinkingMessages,
        speechRecognitionLanguage,
        initialAgentMessage,
        isReadOnly = false,
        readOnlySource,
        messages,
        draftMessage,
        autoExecuteMessage,
        autoExecuteMessageAttachments,
        areFileAttachmentsEnabled,
        feedbackMode,
        activeJobs,
        activeTimeouts,
        currentTimestamp,
        onDraftMessageChange,
        onSubmitUserTurn,
        onStartNewChat,
        newChatButtonHref,
        onCancelActiveJob,
        onCancelActiveTimeout,
        onAutoExecuteMessagePending,
        onAutoExecuteMessageConsumed,
        extraActions,
        variant = 'default',
    } = props;
    const panelState = useCanonicalAgentChatPanelState({
        chatId,
        agentName,
        agentUrl,
        initialAgentMessage,
        isReadOnly,
        messages,
        thinkingMessages,
        autoExecuteMessage,
        autoExecuteMessageAttachments,
        onSubmitUserTurn,
        onAutoExecuteMessagePending,
        onAutoExecuteMessageConsumed,
    });

    return (
        <>
            <CanonicalAgentChatSurface
                brandColor={brandColor}
                inputPlaceholder={inputPlaceholder}
                draftMessage={draftMessage}
                areFileAttachmentsEnabled={areFileAttachmentsEnabled}
                feedbackMode={feedbackMode}
                activeJobs={activeJobs}
                activeTimeouts={activeTimeouts}
                currentTimestamp={currentTimestamp}
                isReadOnly={isReadOnly}
                readOnlySource={readOnlySource}
                onDraftMessageChange={onDraftMessageChange}
                onStartNewChat={onStartNewChat}
                newChatButtonHref={newChatButtonHref}
                onCancelActiveJob={onCancelActiveJob}
                onCancelActiveTimeout={onCancelActiveTimeout}
                extraActions={extraActions}
                speechRecognitionLanguage={speechRecognitionLanguage}
                variant={variant}
                state={panelState.surface}
            />
            <PseudoUserChatDialog
                isOpen={panelState.dialogs.pseudoUser.isOpen}
                prompt={panelState.dialogs.pseudoUser.prompt}
                agentName={panelState.dialogs.pseudoUser.agentName}
                userName={panelState.dialogs.pseudoUser.userName}
                onSubmit={panelState.dialogs.pseudoUser.onSubmit}
                onClose={panelState.dialogs.pseudoUser.onClose}
            />
            <WalletRecordDialog
                isOpen={panelState.dialogs.walletRecord.isOpen}
                request={panelState.dialogs.walletRecord.request}
                onSubmit={panelState.dialogs.walletRecord.onSubmit}
                onClose={panelState.dialogs.walletRecord.onClose}
                githubApp={panelState.dialogs.walletRecord.githubApp}
                calendarOAuth={panelState.dialogs.walletRecord.calendarOAuth}
            />
            {panelState.dialogs.metaDisclaimer.shouldRender && (
                <MetaDisclaimerDialog
                    markdown={panelState.dialogs.metaDisclaimer.markdown}
                    isAccepting={panelState.dialogs.metaDisclaimer.isAccepting}
                    errorMessage={panelState.dialogs.metaDisclaimer.errorMessage}
                    onAccept={panelState.dialogs.metaDisclaimer.onAccept}
                    onRetry={panelState.dialogs.metaDisclaimer.onRetry}
                />
            )}
        </>
    );
}
