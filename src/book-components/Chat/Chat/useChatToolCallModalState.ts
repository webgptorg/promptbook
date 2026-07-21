'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { isPseudoAgentUrl } from '../../../book-2.0/agent-source/pseudoAgentReferences';
import type { AgentChipData } from '../AgentChip/AgentChip';
import type { ChatMessage } from '../types/ChatMessage';
import type { TeamToolCallSummary, TransitiveToolCall } from '../utils/collectTeamToolCallSummary';
import { collectTeamToolCallSummary } from '../utils/collectTeamToolCallSummary';
import { downloadFile } from '../utils/downloadFile';
import type { AgentProfileData } from '../utils/loadAgentProfile';
import { loadAgentProfile, resolveAgentProfileFallback } from '../utils/loadAgentProfile';
import { getToolCallTimestamp } from '../utils/toolCallParsing/getToolCallTimestamp';
import { parseTeamToolResult } from '../utils/toolCallParsing/parseTeamToolResult';
import { parseToolCallResult } from '../utils/toolCallParsing/parseToolCallResult';
import type { TeamToolResult } from '../utils/toolCallParsing/TeamToolResult';
import { createAdvancedToolCallReportFilename, createAdvancedToolCallReportMarkdown } from './renderAdvancedToolCallDetails';

/**
 * Tool-call snapshot rendered by the modal.
 *
 * @private function of `ChatToolCallModal`
 */
type ToolCallModalToolCall = NonNullable<ChatMessage['toolCalls']>[number];

/**
 * Modal view mode used by the tool-call details dialog.
 *
 * @private function of `ChatToolCallModal`
 */
type ToolCallModalViewMode = 'simple' | 'advanced';

/**
 * Export target used by the advanced tool-call report controls.
 *
 * @private function of `ChatToolCallModal`
 */
type ToolCallReportDestination = 'clipboard' | 'file';

/**
 * Inputs required to coordinate `<ChatToolCallModal/>` state.
 *
 * @private function of `useChatToolCallModalState`
 */
type UseChatToolCallModalStateProps = {
    readonly isOpen: boolean;
    readonly toolCall: ToolCallModalToolCall | null;
    /**
     * Stable identity of the selected tool call.
     */
    readonly toolCallIdentity?: string | null;
    readonly onClose: () => void;
    readonly toolTitles?: Record<string, string>;
    readonly teamAgentProfiles?: Record<string, AgentChipData>;
};

/**
 * State and callbacks consumed by `<ChatToolCallModal/>`.
 *
 * @private function of `useChatToolCallModalState`
 */
type UseChatToolCallModalStateResult = {
    readonly clearSelectedTeamToolCall: () => void;
    readonly exportAdvancedToolCallReport: (destination: ToolCallReportDestination) => Promise<void>;
    readonly focusedToolCall: ToolCallModalToolCall | null;
    readonly isAdvancedView: boolean;
    readonly modalDialogRef: MutableRefObject<HTMLDivElement | null>;
    readonly openAdvancedView: () => void;
    readonly selectTeamToolCall: (toolCall: TransitiveToolCall) => void;
    readonly selectedTeamToolCall: TransitiveToolCall | null;
    readonly teamProfiles: Record<string, AgentProfileData>;
    readonly teamResult: TeamToolResult | null;
    readonly teamToolCallSummary: TeamToolCallSummary;
    readonly toggleViewMode: () => void;
    readonly toolCallDate: Date | null;
};

/**
 * Resolved team-profile lookup request for one TEAM tool call.
 *
 * @private function of `useChatToolCallModalState`
 */
type TeamProfileRequest = {
    readonly initialProfile: AgentProfileData;
    readonly teammateLabel: string | undefined;
    readonly teammateOverride?: AgentChipData;
    readonly teammateUrl: string;
};

/**
 * Inputs required to resolve a team-profile lookup request.
 *
 * @private function of `useChatToolCallModalState`
 */
type ResolveTeamProfileRequestOptions = {
    readonly isOpen: boolean;
    readonly toolCall: ToolCallModalToolCall | null;
    readonly teamAgentProfiles?: Record<string, AgentChipData>;
    readonly teamResult: TeamToolResult | null;
};

/**
 * Inputs required to synchronize cached TEAM agent profiles.
 *
 * @private function of `useChatToolCallModalState`
 */
type UseTeamProfilesOptions = ResolveTeamProfileRequestOptions;

/**
 * Inputs required to focus the modal when it opens and restore focus after close.
 *
 * @private function of `useChatToolCallModalState`
 */
type UseToolCallModalFocusOptions = {
    readonly isOpen: boolean;
    readonly modalDialogRef: MutableRefObject<HTMLDivElement | null>;
    readonly toolCallIdentity?: string | null;
};

/**
 * Inputs required to support Escape-key dismissal.
 *
 * @private function of `useChatToolCallModalState`
 */
type UseToolCallModalEscapeKeyOptions = {
    readonly isOpen: boolean;
    readonly onClose: () => void;
};

/**
 * Upserts one cached team profile while preserving referential equality when nothing changed.
 *
 * @private function of `useChatToolCallModalState`
 */
function mergeTeamProfile(
    previous: Record<string, AgentProfileData>,
    teammateUrl: string,
    nextProfile: AgentProfileData,
): Record<string, AgentProfileData> {
    const existing = previous[teammateUrl];
    if (existing && existing.label === nextProfile.label && existing.imageUrl === nextProfile.imageUrl) {
        return previous;
    }

    return {
        ...previous,
        [teammateUrl]: nextProfile,
    };
}

/**
 * Resolves the teammate profile seed used by the TEAM tool-call view.
 *
 * @private function of `useChatToolCallModalState`
 */
function resolveTeamProfileRequest({
    isOpen,
    toolCall,
    teamAgentProfiles,
    teamResult,
}: ResolveTeamProfileRequestOptions): TeamProfileRequest | null {
    if (!isOpen || !toolCall) {
        return null;
    }

    const teammateUrl = teamResult?.teammate?.url;
    if (!teammateUrl || teammateUrl === 'VOID' || isPseudoAgentUrl(teammateUrl)) {
        return null;
    }

    const fallbackProfile = resolveAgentProfileFallback({
        url: teammateUrl,
        label: teamResult.teammate?.label,
    });
    const teammateOverride = teamAgentProfiles?.[toolCall.name];

    return {
        initialProfile: {
            label: teammateOverride?.label || fallbackProfile.label,
            imageUrl: teammateOverride?.imageUrl ?? fallbackProfile.imageUrl,
        },
        teammateLabel: teamResult.teammate?.label,
        teammateOverride,
        teammateUrl,
    };
}

/**
 * Keeps the cached TEAM participant profiles in sync with the currently focused tool call.
 *
 * @private function of `useChatToolCallModalState`
 */
function useTeamProfiles({
    isOpen,
    toolCall,
    teamAgentProfiles,
    teamResult,
}: UseTeamProfilesOptions): Record<string, AgentProfileData> {
    const [teamProfiles, setTeamProfiles] = useState<Record<string, AgentProfileData>>({});
    const teamProfileRequest = useMemo(
        () =>
            resolveTeamProfileRequest({
                isOpen,
                toolCall,
                teamAgentProfiles,
                teamResult,
            }),
        [isOpen, teamAgentProfiles, teamResult, toolCall],
    );

    useEffect(() => {
        if (!teamProfileRequest) {
            return;
        }

        setTeamProfiles((previous) =>
            mergeTeamProfile(previous, teamProfileRequest.teammateUrl, teamProfileRequest.initialProfile),
        );

        if (teamProfileRequest.teammateOverride) {
            return;
        }

        let isMounted = true;
        const profileLoader = loadAgentProfile({
            url: teamProfileRequest.teammateUrl,
            label: teamProfileRequest.teammateLabel,
        }).then((profile) => {
            if (!isMounted) {
                return;
            }

            setTeamProfiles((previous) => mergeTeamProfile(previous, teamProfileRequest.teammateUrl, profile));
        });

        return () => {
            isMounted = false;
            void profileLoader;
        };
    }, [teamProfileRequest]);

    return teamProfiles;
}

/**
 * Focuses the modal dialog after open and restores the previously focused element on cleanup.
 *
 * @private function of `useChatToolCallModalState`
 */
function useToolCallModalFocus({ isOpen, modalDialogRef, toolCallIdentity }: UseToolCallModalFocusOptions): void {
    const previousActiveElementRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        previousActiveElementRef.current =
            typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;

        const animationFrame = requestAnimationFrame(() => {
            modalDialogRef.current?.focus();
        });

        return () => {
            cancelAnimationFrame(animationFrame);
            previousActiveElementRef.current?.focus();
            previousActiveElementRef.current = null;
        };
    }, [isOpen, modalDialogRef, toolCallIdentity]);
}

/**
 * Closes the tool-call modal when Escape is pressed.
 *
 * @private function of `useChatToolCallModalState`
 */
function useToolCallModalEscapeKey({ isOpen, onClose }: UseToolCallModalEscapeKeyOptions): void {
    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') {
                return;
            }

            event.preventDefault();
            onClose();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);
}

/**
 * Copies the advanced markdown report into the system clipboard when supported.
 *
 * @private function of `useChatToolCallModalState`
 */
async function copyAdvancedToolCallReportToClipboard(reportMarkdown: string): Promise<void> {
    if (!navigator.clipboard?.writeText) {
        console.error('[ChatToolCallModal] Failed to copy advanced report because Clipboard API is unavailable.');
        return;
    }

    try {
        await navigator.clipboard.writeText(reportMarkdown);
    } catch (error) {
        console.error('[ChatToolCallModal] Failed to copy advanced tool call report:', error);
    }
}

/**
 * Downloads the advanced markdown report to a local file.
 *
 * @private function of `useChatToolCallModalState`
 */
function downloadAdvancedToolCallReport(reportMarkdown: string, toolCall: ToolCallModalToolCall): void {
    downloadFile(reportMarkdown, createAdvancedToolCallReportFilename(toolCall), 'text/markdown');
}

/**
 * Coordinates derived data, modal lifecycle, and advanced-export actions for `<ChatToolCallModal/>`.
 *
 * @private function of `ChatToolCallModal`
 */
export function useChatToolCallModalState({
    isOpen,
    toolCall,
    toolCallIdentity,
    onClose,
    toolTitles,
    teamAgentProfiles,
}: UseChatToolCallModalStateProps): UseChatToolCallModalStateResult {
    const [selectedTeamToolCall, setSelectedTeamToolCall] = useState<TransitiveToolCall | null>(null);
    const [viewMode, setViewMode] = useState<ToolCallModalViewMode>('simple');
    const modalDialogRef = useRef<HTMLDivElement>(null);

    const resultRaw = useMemo(() => (toolCall ? parseToolCallResult(toolCall.result) : null), [toolCall]);
    const teamResult = useMemo(() => parseTeamToolResult(resultRaw), [resultRaw]);
    const toolCallDate = useMemo(() => (toolCall ? getToolCallTimestamp(toolCall) : null), [toolCall]);
    const teamToolCallSummary = useMemo(() => collectTeamToolCallSummary(toolCall ? [toolCall] : []), [toolCall]);
    const teamProfiles = useTeamProfiles({
        isOpen,
        toolCall,
        teamAgentProfiles,
        teamResult,
    });
    const focusedToolCall = selectedTeamToolCall?.toolCall || toolCall;
    const isAdvancedView = viewMode === 'advanced';

    useEffect(() => {
        setSelectedTeamToolCall(null);
        setViewMode('simple');
    }, [isOpen, toolCallIdentity]);

    useToolCallModalFocus({
        isOpen,
        modalDialogRef,
        toolCallIdentity,
    });
    useToolCallModalEscapeKey({
        isOpen,
        onClose,
    });

    const selectTeamToolCall = useCallback((nextToolCall: TransitiveToolCall) => {
        setSelectedTeamToolCall(nextToolCall);
    }, []);

    const clearSelectedTeamToolCall = useCallback(() => {
        setSelectedTeamToolCall(null);
    }, []);

    const openAdvancedView = useCallback(() => {
        setViewMode('advanced');
    }, []);

    const toggleViewMode = useCallback(() => {
        setViewMode((previous) => (previous === 'simple' ? 'advanced' : 'simple'));
    }, []);

    const exportAdvancedToolCallReport = useCallback(
        async (destination: ToolCallReportDestination): Promise<void> => {
            if (!isAdvancedView || !focusedToolCall) {
                return;
            }

            const reportMarkdown = createAdvancedToolCallReportMarkdown({
                toolCall: focusedToolCall,
                toolTitles,
            });

            if (destination === 'file') {
                downloadAdvancedToolCallReport(reportMarkdown, focusedToolCall);
                return;
            }

            await copyAdvancedToolCallReportToClipboard(reportMarkdown);
        },
        [focusedToolCall, isAdvancedView, toolTitles],
    );

    return {
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
    };
}
