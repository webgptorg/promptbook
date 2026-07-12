'use client';

import { ClipboardCopy, FileDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { AdminChatTaskRecord } from '@/src/utils/chatTasksAdmin';
import { downloadBlob } from '@/src/utils/download/browserFileDownload';

/**
 * Duration (ms) of the transient feedback shown next to the log action buttons.
 *
 * @private constant of `<TaskManagerTaskLogActions/>`
 */
const TASK_LOG_ACTION_FEEDBACK_DURATION_MS = 2500;

/**
 * Props for the post-mortem log copy/download actions of one task row.
 *
 * @private function of TaskManagerTaskRow
 */
type TaskManagerTaskLogActionsProps = {
    task: AdminChatTaskRecord;
};

/**
 * Builds the downloadable post-mortem log text of one background task.
 *
 * @private function of TaskManagerTaskRow
 */
export function createTaskPostMortemLogText(task: AdminChatTaskRecord): string {
    const logLines: Array<string> = [
        `Task: ${task.id}`,
        `Kind: ${task.kind}`,
        `Status: ${task.status}`,
        `Created: ${task.createdAt}`,
        `Queued: ${task.queuedAt}`,
        `Started: ${task.startedAt || '-'}`,
        `Finished: ${task.finishedAt || '-'}`,
        `Attempts: ${task.attemptCount}`,
        `Retries: ${task.retryCount}`,
        `Worker: ${task.workerId || '-'}`,
        `Queue: ${task.queueName || '-'}`,
    ];

    if (task.lastErrorSummary) {
        logLines.push('', 'Last error summary:', task.lastErrorSummary);
    }

    if (task.lastErrorDetails) {
        logLines.push('', 'Last error details:', task.lastErrorDetails);
    }

    return logLines.join('\n') + '\n';
}

/**
 * Resolves a filesystem-safe download filename for one task log.
 *
 * @private function of TaskManagerTaskRow
 */
function createTaskLogDownloadFilename(task: AdminChatTaskRecord): string {
    const sanitizedTaskId = task.id.replace(/[^a-zA-Z0-9_-]+/g, '-');
    return `task-${sanitizedTaskId}-log.txt`;
}

/**
 * Copy and download buttons for the post-mortem log of one background task.
 *
 * @private function of TaskManagerTaskRow
 */
export function TaskManagerTaskLogActions({ task }: TaskManagerTaskLogActionsProps) {
    const [actionFeedback, setActionFeedback] = useState<string | null>(null);
    const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
    const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (feedbackTimeoutRef.current !== null) {
                clearTimeout(feedbackTimeoutRef.current);
                feedbackTimeoutRef.current = null;
            }
        };
    }, []);

    function showActionFeedback(feedbackMessage: string): void {
        if (feedbackTimeoutRef.current !== null) {
            clearTimeout(feedbackTimeoutRef.current);
        }
        setActionFeedback(feedbackMessage);
        setActionErrorMessage(null);
        feedbackTimeoutRef.current = setTimeout(() => {
            setActionFeedback(null);
            feedbackTimeoutRef.current = null;
        }, TASK_LOG_ACTION_FEEDBACK_DURATION_MS);
    }

    async function handleCopyLog(): Promise<void> {
        try {
            if (!navigator.clipboard?.writeText) {
                throw new Error('The browser clipboard API is unavailable in this context.');
            }
            await navigator.clipboard.writeText(createTaskPostMortemLogText(task));
            showActionFeedback('Copied!');
        } catch (error) {
            setActionErrorMessage(error instanceof Error ? error.message : 'Failed to copy the task log.');
        }
    }

    function handleDownloadLog(): void {
        try {
            const logBlob = new Blob([createTaskPostMortemLogText(task)], { type: 'text/plain;charset=utf-8' });
            downloadBlob(logBlob, createTaskLogDownloadFilename(task));
            showActionFeedback('Saved!');
        } catch (error) {
            setActionErrorMessage(error instanceof Error ? error.message : 'Failed to download the task log.');
        }
    }

    return (
        <div className="flex flex-wrap items-center gap-2">
            <button
                type="button"
                onClick={() => void handleCopyLog()}
                className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[10px] font-semibold text-gray-600 hover:bg-gray-50"
                title="Copy the post-mortem log of this task"
            >
                <ClipboardCopy className="h-3 w-3" />
                Copy log
            </button>
            <button
                type="button"
                onClick={handleDownloadLog}
                className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[10px] font-semibold text-gray-600 hover:bg-gray-50"
                title="Download the post-mortem log of this task"
            >
                <FileDown className="h-3 w-3" />
                Download log
            </button>
            {actionFeedback && (
                <span className="text-[10px] text-emerald-600" role="status" aria-live="polite">
                    {actionFeedback}
                </span>
            )}
            {actionErrorMessage && (
                <span className="text-[10px] text-rose-700" role="alert">
                    {actionErrorMessage}
                </span>
            )}
        </div>
    );
}
