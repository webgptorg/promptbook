'use client';

import type { MouseEvent } from 'react';
import { Color } from '../../../utils/color/Color';
import type { WithTake } from '../../../utils/take/interfaces/ITakeChain';
import type { PromptbookComponentTheme } from '../../_common/PromptbookComponentTheme';
import { classNames } from '../../_common/react-utils/classNames';
import { CloseIcon } from '../../icons/CloseIcon';
import type { AgentChipData } from '../AgentChip/AgentChip';
import type { ChatMessage } from '../types/ChatMessage';
import type { ChatParticipant } from '../types/ChatParticipant';
import styles from './Chat.module.css';
import { ChatToolCallModalContent } from './ChatToolCallModalContent';
import { useChatToolCallModalState } from './useChatToolCallModalState';

/**
 * Props for the tool call details modal.
 *
 * @private component of `<Chat/>`
 */
export type ChatToolCallModalProps = {
    isOpen: boolean;
    toolCall: NonNullable<ChatMessage['toolCalls']>[number] | null;
    /**
     * Stable identity of the selected tool call.
     *
     * Used so live streamed snapshots do not reset the current modal view.
     */
    toolCallIdentity?: string | null;
    onClose: () => void;
    toolTitles?: Record<string, string>;
    agentParticipant?: ChatParticipant;
    buttonColor: WithTake<Color>;
    /**
     * Optional cached team agent metadata keyed by TEAM tool name.
     */
    teamAgentProfiles?: Record<string, AgentChipData>;
    /**
     * Optional localized labels for the tool call modal UI elements.
     */
    chatUiTranslations?: import('./ChatProps').ChatUiTranslations;
    /**
     * Optional BCP-47 locale string used to format time labels in the modal.
     * When omitted the browser/OS default locale is used.
     */
    locale?: string;
    /**
     * Optional list of tools that were available to the model during the turn that produced this tool call.
     *
     * When provided, the advanced view includes an "Available tools" payload section so developers can
     * inspect what capabilities the model had access to at the exact moment of the request.
     */
    availableTools?: ChatMessage['availableTools'];
    theme?: PromptbookComponentTheme;
};

/**
 * Closes the tool-call modal only when the backdrop itself was clicked.
 *
 * @private function of `ChatToolCallModal`
 */
function handleModalBackdropClick(event: MouseEvent<HTMLDivElement>, onClose: () => void): void {
    if (event.target === event.currentTarget) {
        onClose();
    }
}

/**
 * Modal that renders rich tool call details for chat chiplets.
 *
 * @private component of `<Chat/>`
 */
export function ChatToolCallModal(props: ChatToolCallModalProps) {
    const {
        isOpen,
        toolCall,
        toolCallIdentity,
        onClose,
        toolTitles,
        agentParticipant,
        buttonColor,
        teamAgentProfiles,
        chatUiTranslations,
        locale,
        availableTools,
        theme,
    } = props;
    const {
        clearSelectedTeamToolCall,
        exportAdvancedToolCallReport,
        focusedToolCall,
        isAdvancedView,
        modalDialogRef,
        openAdvancedView,
        selectTeamToolCall,
        selectedTeamToolCall,
        teamProfiles,
        teamResult,
        teamToolCallSummary,
        toggleViewMode,
        toolCallDate,
    } = useChatToolCallModalState({
        isOpen,
        toolCall,
        toolCallIdentity,
        onClose,
        toolTitles,
        teamAgentProfiles,
    });

    if (!isOpen || !toolCall) {
        return null;
    }

    const resolvedFocusedToolCall = focusedToolCall || toolCall;
    const modalTitle = chatUiTranslations?.toolCallModalTitle || 'Tool call details';
    const closeButtonLabel = chatUiTranslations?.toolCallModalCloseLabel || 'Close tool call details';
    const copyButtonLabel = chatUiTranslations?.toolCallModalCopyLabel || 'Copy';
    const saveButtonLabel = chatUiTranslations?.toolCallModalSaveLabel || 'Save';
    const modeToggleLabel = isAdvancedView
        ? chatUiTranslations?.toolCallModalSimpleLabel || 'Simple'
        : chatUiTranslations?.toolCallModalAdvancedLabel || 'Advanced';

    return (
        <div
            className={styles.ratingModal}
            onClick={(event) => {
                handleModalBackdropClick(event, onClose);
            }}
        >
            <div
                ref={modalDialogRef}
                className={classNames(styles.ratingModalContent, styles.toolCallModal)}
                role="dialog"
                aria-modal="true"
                aria-label={modalTitle}
                tabIndex={-1}
            >
                <button
                    type="button"
                    className={styles.modalCloseButton}
                    onClick={onClose}
                    aria-label={closeButtonLabel}
                >
                    <CloseIcon />
                </button>
                <ChatToolCallModalContent
                    toolCall={toolCall}
                    focusedToolCall={resolvedFocusedToolCall}
                    isAdvancedView={isAdvancedView}
                    teamResult={teamResult}
                    toolCallDate={toolCallDate}
                    teamToolCallSummary={teamToolCallSummary}
                    selectedTeamToolCall={selectedTeamToolCall}
                    onSelectTeamToolCall={selectTeamToolCall}
                    onClearSelectedTeamToolCall={clearSelectedTeamToolCall}
                    teamProfiles={teamProfiles}
                    toolTitles={toolTitles}
                    agentParticipant={agentParticipant}
                    buttonColor={buttonColor}
                    locale={locale}
                    chatUiTranslations={chatUiTranslations}
                    availableTools={availableTools}
                    theme={theme}
                    onRequestAdvancedView={openAdvancedView}
                />
                <div className={styles.toolCallModeFooter}>
                    {isAdvancedView && (
                        <>
                            <button
                                type="button"
                                className={styles.toolCallModeButton}
                                onClick={() => {
                                    void exportAdvancedToolCallReport('clipboard');
                                }}
                            >
                                {copyButtonLabel}
                            </button>
                            <button
                                type="button"
                                className={styles.toolCallModeButton}
                                onClick={() => {
                                    void exportAdvancedToolCallReport('file');
                                }}
                            >
                                {saveButtonLabel}
                            </button>
                        </>
                    )}
                    <button type="button" className={styles.toolCallModeButton} onClick={toggleViewMode}>
                        {modeToggleLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
