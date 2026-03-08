'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { isPseudoAgentUrl } from '../../../book-2.0/agent-source/pseudoAgentReferences';
import { Color } from '../../../utils/color/Color';
import type { WithTake } from '../../../utils/take/interfaces/ITakeChain';
import { classNames } from '../../_common/react-utils/classNames';
import { CloseIcon } from '../../icons/CloseIcon';
import type { AgentChipData } from '../AgentChip/AgentChip';
import type { ChatMessage } from '../types/ChatMessage';
import type { ChatParticipant } from '../types/ChatParticipant';
import { type TransitiveToolCall, collectTeamToolCallSummary } from '../utils/collectTeamToolCallSummary';
import { downloadFile } from '../utils/downloadFile';
import { loadAgentProfile, resolveAgentProfileFallback, type AgentProfileData } from '../utils/loadAgentProfile';
import { getToolCallTimestamp, parseTeamToolResult, parseToolCallResult } from '../utils/toolCallParsing';
import styles from './Chat.module.css';
import {
    createAdvancedToolCallReportFilename,
    createAdvancedToolCallReportMarkdown,
    renderAdvancedToolCallDetails,
} from './renderAdvancedToolCallDetails';
import { renderToolCallDetails } from './renderToolCallDetails';
import { TeamToolCallModalContent } from './TeamToolCallModalContent';

/**
 * Props for the tool call details modal.
 *
 * @private component of `<Chat/>`
 */
export type ChatToolCallModalProps = {
    isOpen: boolean;
    toolCall: NonNullable<ChatMessage['toolCalls']>[number] | null;
    onClose: () => void;
    toolTitles?: Record<string, string>;
    agentParticipant?: ChatParticipant;
    buttonColor: WithTake<Color>;
    /**
     * Optional cached team agent metadata keyed by TEAM tool name.
     */
    teamAgentProfiles?: Record<string, AgentChipData>;
};

/**
 * View mode available in the tool action modal.
 *
 * @private internal utility of `<ChatToolCallModal/>`
 */
type ToolCallModalViewMode = 'simple' | 'advanced';

/**
 * Advanced report export target.
 *
 * @private internal utility of `<ChatToolCallModal/>`
 */
type ToolCallReportDestination = 'clipboard' | 'file';

/**
 * Modal that renders rich tool call details for chat chiplets.
 *
 * @private component of `<Chat/>`
 */
export function ChatToolCallModal(props: ChatToolCallModalProps) {
    const { isOpen, toolCall, onClose, toolTitles, agentParticipant, buttonColor, teamAgentProfiles } = props;
    const [teamProfiles, setTeamProfiles] = useState<Record<string, AgentProfileData>>({});
    const [selectedTeamToolCall, setSelectedTeamToolCall] = useState<TransitiveToolCall | null>(null);
    const [viewMode, setViewMode] = useState<ToolCallModalViewMode>('simple');

    const resultRaw = useMemo(() => (toolCall ? parseToolCallResult(toolCall.result) : null), [toolCall]);
    const teamResult = useMemo(() => parseTeamToolResult(resultRaw), [resultRaw]);
    const toolCallDate = useMemo(() => (toolCall ? getToolCallTimestamp(toolCall) : null), [toolCall]);
    const teamToolCallSummary = useMemo(() => collectTeamToolCallSummary(toolCall ? [toolCall] : []), [toolCall]);

    useEffect(() => {
        if (!isOpen || !toolCall) {
            return;
        }

        const teammateUrl = teamResult?.teammate?.url;

        if (!teammateUrl || teammateUrl === 'VOID' || isPseudoAgentUrl(teammateUrl)) {
            return;
        }

        const fallbackProfile = resolveAgentProfileFallback({
            url: teammateUrl,
            label: teamResult.teammate?.label,
        });
        const teammateOverride = teamAgentProfiles?.[toolCall.name];

        setTeamProfiles((previous) => {
            const nextProfile = {
                label: teammateOverride?.label || fallbackProfile.label,
                imageUrl: teammateOverride?.imageUrl ?? fallbackProfile.imageUrl,
            };

            const existing = previous[teammateUrl];
            if (existing && existing.label === nextProfile.label && existing.imageUrl === nextProfile.imageUrl) {
                return previous;
            }

            return { ...previous, [teammateUrl]: nextProfile };
        });

        if (teammateOverride) {
            return;
        }

        let isMounted = true;
        const profileLoader = loadAgentProfile({ url: teammateUrl, label: teamResult.teammate?.label }).then(
            (profile) => {
                if (!isMounted) {
                    return;
                }

                setTeamProfiles((previous) => {
                    const existing = previous[teammateUrl];
                    if (existing && existing.label === profile.label && existing.imageUrl === profile.imageUrl) {
                        return previous;
                    }
                    return { ...previous, [teammateUrl]: profile };
                });
            },
        );

        return () => {
            isMounted = false;
            void profileLoader;
        };
    }, [isOpen, toolCall, teamResult, teamAgentProfiles]);

    useEffect(() => {
        if (!isOpen) {
            setSelectedTeamToolCall(null);
            setViewMode('simple');
            return;
        }

        setSelectedTeamToolCall(null);
        setViewMode('simple');
    }, [isOpen, toolCall]);

    const focusedToolCallCandidate = selectedTeamToolCall?.toolCall || toolCall;
    const handleAdvancedToolCallReportExport = useCallback(
        async (destination: ToolCallReportDestination): Promise<void> => {
            if (viewMode !== 'advanced' || !focusedToolCallCandidate) {
                return;
            }

            const reportMarkdown = createAdvancedToolCallReportMarkdown({
                toolCall: focusedToolCallCandidate,
                toolTitles,
            });

            if (destination === 'file') {
                downloadFile(
                    reportMarkdown,
                    createAdvancedToolCallReportFilename(focusedToolCallCandidate),
                    'text/markdown',
                );
                return;
            }

            if (!navigator.clipboard?.writeText) {
                console.error(
                    '[ChatToolCallModal] Failed to copy advanced report because Clipboard API is unavailable.',
                );
                return;
            }

            try {
                await navigator.clipboard.writeText(reportMarkdown);
            } catch (error) {
                console.error('[ChatToolCallModal] Failed to copy advanced tool call report:', error);
            }
        },
        [focusedToolCallCandidate, toolTitles, viewMode],
    );

    if (!isOpen || !toolCall) {
        return null;
    }

    const focusedToolCall = selectedTeamToolCall?.toolCall || toolCall;

    const modalContent =
        viewMode === 'advanced' ? (
            renderAdvancedToolCallDetails({
                toolCall: focusedToolCall,
                toolTitles,
            })
        ) : teamResult?.teammate ? (
            <TeamToolCallModalContent
                teamResult={teamResult}
                toolCallDate={toolCallDate}
                teamToolCallSummary={teamToolCallSummary}
                selectedTeamToolCall={selectedTeamToolCall}
                onSelectTeamToolCall={setSelectedTeamToolCall}
                onClearSelectedTeamToolCall={() => {
                    setSelectedTeamToolCall(null);
                }}
                teamProfiles={teamProfiles}
                toolTitles={toolTitles}
                agentParticipant={agentParticipant}
                buttonColor={buttonColor}
            />
        ) : (
            renderToolCallDetails({
                toolCall,
                toolTitles,
                agentParticipant,
                buttonColor,
            })
        );

    return (
        <div
            className={styles.ratingModal}
            onClick={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <div className={classNames(styles.ratingModalContent, styles.toolCallModal)}>
                <button type="button" className={styles.modalCloseButton} onClick={onClose} aria-label="Close dialog">
                    <CloseIcon />
                </button>
                {modalContent}
                <div className={styles.toolCallModeFooter}>
                    {viewMode === 'advanced' && (
                        <>
                            <button
                                type="button"
                                className={styles.toolCallModeButton}
                                onClick={() => {
                                    void handleAdvancedToolCallReportExport('clipboard');
                                }}
                            >
                                Copy
                            </button>
                            <button
                                type="button"
                                className={styles.toolCallModeButton}
                                onClick={() => {
                                    void handleAdvancedToolCallReportExport('file');
                                }}
                            >
                                Save
                            </button>
                        </>
                    )}
                    <button
                        type="button"
                        className={styles.toolCallModeButton}
                        onClick={() => {
                            setViewMode((previous) => (previous === 'simple' ? 'advanced' : 'simple'));
                        }}
                    >
                        {viewMode === 'simple' ? 'Advanced' : 'Simple'}
                    </button>
                </div>
            </div>
        </div>
    );
}
