'use client';

import type { string_book } from '@promptbook-local/types';
import { AlertTriangleIcon, CheckCircle2Icon, Clock3Icon, HistoryIcon, Loader2Icon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useCallback, useMemo } from 'react';
import { useUnsavedChangesGuard } from '../../../../components/utils/useUnsavedChangesGuard';
import { createAgentBookMonacoModelPath } from './createAgentBookMonacoModelPath';
import { useBookEditorDiagnostics } from './useBookEditorDiagnostics';
import { useBookEditorHistory } from './useBookEditorHistory';
import { type SaveStatus, useBookEditorSaving } from './useBookEditorSaving';

/**
 * Input consumed by `useBookEditorWrapper`.
 *
 * @private function of BookEditorWrapper
 */
type UseBookEditorWrapperProps = {
    /**
     * Agent route identifier used by editor-related APIs.
     */
    readonly agentName: string;
    /**
     * Initial agent source loaded on the server.
     */
    readonly initialAgentSource: string_book;
};

/**
 * One hoisted Book editor menu action.
 */
type BookEditorHoistedMenuItem = {
    readonly key: string;
    readonly icon: ReactNode;
    readonly name: string;
    readonly onClick: () => void;
    readonly isActive?: boolean;
};

/**
 * Resolves human-visible status label for current save state.
 *
 * @param saveStatus - Current state of autosave state machine.
 * @returns Short status text shown in the Book toolbar.
 * @private function of BookEditorWrapper
 */
function resolveSaveStatusLabel(saveStatus: SaveStatus): string {
    if (saveStatus === 'pending') {
        return 'Save queued';
    }
    if (saveStatus === 'saving') {
        return 'Saving...';
    }
    if (saveStatus === 'error') {
        return 'Save failed';
    }
    return 'Saved';
}

/**
 * Resolves save-status icon displayed in hoisted menu controls.
 *
 * @param saveStatus - Current state of autosave state machine.
 * @returns Icon for the current save state.
 * @private function of BookEditorWrapper
 */
function resolveSaveStatusMenuIcon(saveStatus: SaveStatus): ReactNode {
    if (saveStatus === 'saving') {
        return <Loader2Icon className="h-4 w-4 animate-spin text-blue-600" />;
    }

    if (saveStatus === 'pending') {
        return <Clock3Icon className="h-4 w-4 text-blue-600" />;
    }

    if (saveStatus === 'error') {
        return <AlertTriangleIcon className="h-4 w-4 text-red-600" />;
    }

    return <CheckCircle2Icon className="h-4 w-4 text-emerald-600" />;
}

/**
 * Manages the stateful editor behavior behind `<BookEditorWrapper/>`.
 *
 * @private function of BookEditorWrapper
 */
export function useBookEditorWrapper({ agentName, initialAgentSource }: UseBookEditorWrapperProps) {
    const monacoModelPath = createAgentBookMonacoModelPath(agentName);
    const {
        agentSource,
        saveStatus,
        saveErrorMessage,
        currentSourceVersion,
        lastConfirmedSourceVersion,
        isSaveInFlight,
        isSaveDebounced,
        successfulSaveSequence,
        isBookSavedOnServer,
        handleSourceChange,
        retrySaveNow,
        cancelPendingSave,
        saveCurrentSourceAsNamedVersion,
        replaceWithRestoredSource,
    } = useBookEditorSaving({
        agentName,
        initialAgentSource,
    });
    const {
        diagnostics,
        missingAgentReferences,
        creatingReference,
        requestDiagnostics,
        scheduleDiagnostics,
        handleCreateReferencedAgent,
    } = useBookEditorDiagnostics({
        agentName,
        initialAgentSource,
        agentSource,
    });
    const { isHistoryOpen, historyVersionCount, toggleHistoryPanel, historyPanelProps } = useBookEditorHistory({
        agentName,
        isSaveInFlight,
        isSaveDebounced,
        currentSourceVersion,
        lastConfirmedSourceVersion,
        successfulSaveSequence,
        saveCurrentSourceAsNamedVersion,
        cancelPendingSave,
        replaceWithRestoredSource,
        requestDiagnostics,
    });

    /**
     * Updates local state and schedules save plus diagnostics for editor changes.
     *
     * @private function of BookEditorWrapper
     */
    const handleChange = useCallback(
        (newSource: string_book) => {
            handleSourceChange(newSource);
            scheduleDiagnostics(newSource);
        },
        [handleSourceChange, scheduleDiagnostics],
    );

    const shouldPreventLeavingPage = !isBookSavedOnServer;
    const leaveGuardMessage =
        saveStatus === 'error'
            ? 'Book save failed. Stay on this page until the source is saved on the server.'
            : 'Book changes are still being saved. Stay on this page until the save completes.';

    useUnsavedChangesGuard({
        hasUnsavedChanges: shouldPreventLeavingPage,
        preventInAppNavigation: true,
        message: leaveGuardMessage,
    });

    const saveStatusLabel = resolveSaveStatusLabel(saveStatus);

    /**
     * Retries save directly from the hoisted status menu.
     *
     * @private function of BookEditorWrapper
     */
    const handleSaveStatusMenuClick = useCallback(() => {
        if (saveStatus === 'error') {
            retrySaveNow();
        }
    }, [retrySaveNow, saveStatus]);

    const hoistedMenuItems = useMemo<Array<BookEditorHoistedMenuItem>>(
        () => [
            {
                key: 'book-save-status',
                icon: resolveSaveStatusMenuIcon(saveStatus),
                name:
                    saveStatus === 'error'
                        ? `${saveStatusLabel}: ${saveErrorMessage || 'Click to retry save.'}`
                        : `Book status: ${saveStatusLabel}`,
                onClick: handleSaveStatusMenuClick,
                isActive: saveStatus === 'pending' || saveStatus === 'saving' || saveStatus === 'error',
            },
            {
                key: 'book-history-toggle',
                icon: <HistoryIcon className="h-4 w-4" />,
                name: isHistoryOpen ? `Hide history (${historyVersionCount})` : `Show history (${historyVersionCount})`,
                onClick: toggleHistoryPanel,
                isActive: isHistoryOpen,
            },
        ],
        [
            handleSaveStatusMenuClick,
            historyVersionCount,
            isHistoryOpen,
            saveErrorMessage,
            saveStatus,
            saveStatusLabel,
            toggleHistoryPanel,
        ],
    );

    return {
        agentSource,
        monacoModelPath,
        diagnostics,
        saveStatus,
        saveErrorMessage,
        retrySaveNow,
        handleChange,
        hoistedMenuItems,
        missingAgentReferences,
        creatingReference,
        handleCreateReferencedAgent,
        historyPanelProps,
    };
}
