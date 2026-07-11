'use client';

import { Loader2, X } from 'lucide-react';
import { AdminXtermTerminal } from '@/src/components/AdminTerminal/AdminXtermTerminal';
import {
    useAdminTerminalSession,
    type AdminTerminalSession,
} from '@/src/components/AdminTerminal/useAdminTerminalSession';
import { Dialog } from '@/src/components/Portal/Dialog';
import type { AdminChatTaskRecord } from '@/src/utils/chatTasksAdmin';

/**
 * Props for the read-only live terminal dialog of one background task.
 *
 * @private function of TaskManagerTaskRow
 */
type TaskManagerTaskTerminalDialogProps = {
    task: AdminChatTaskRecord;
    onClose: () => void;
};

/**
 * Resolves the compact status label shown next to the terminal.
 *
 * @private function of TaskManagerTaskTerminalDialog
 */
function resolveTerminalStatusLabel(session: AdminTerminalSession | null, isLoading: boolean): string {
    if (isLoading && !session) {
        return 'Connecting…';
    }

    if (!session) {
        return 'Terminal unavailable';
    }

    if (session.isRunning) {
        return 'Live';
    }

    if (session.exitCode === 0) {
        return 'Finished successfully';
    }

    if (session.exitCode !== null) {
        return 'Finished with an error or cancelled';
    }

    return 'Not running';
}

/**
 * Super-admin dialog streaming the read-only CLI terminal of one background task in real time.
 *
 * @private function of TaskManagerTaskRow
 */
export function TaskManagerTaskTerminalDialog({ task, onClose }: TaskManagerTaskTerminalDialogProps) {
    const terminal = useAdminTerminalSession({
        basePath: `/api/admin/chat-tasks/${encodeURIComponent(task.id)}/terminal`,
        loadErrorMessage: 'Failed to load the task terminal.',
        startErrorMessage: 'Failed to open the task terminal.',
        sendErrorMessage: 'The task terminal is read-only.',
        stopErrorMessage: 'The task terminal cannot be stopped from here.',
        startSuccessMessage: 'Task terminal opened.',
        finishSuccessMessage: 'The task finished successfully.',
        finishErrorMessage: 'The task finished with an error or was cancelled.',
    });

    return (
        <Dialog onClose={onClose} className="w-[min(70rem,95vw)] p-6" ariaLabel={`Task terminal ${task.id}`}>
            <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <h2 className="text-lg font-semibold text-slate-900">Task terminal</h2>
                        <p className="mt-1 break-all font-mono text-xs text-slate-500">{task.id}</p>
                        <p className="mt-1 text-sm text-slate-600">
                            Read-only live view of everything this task prints while it runs — the output of the
                            whole Agents Server is not shown here, only this task&apos;s own terminal.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="shrink-0 rounded-md border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50"
                        aria-label="Close task terminal"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {terminal.errorMessage ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {terminal.errorMessage}
                    </div>
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-slate-700">Terminal output</h3>
                    <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                        {terminal.isLoadingSession ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        {resolveTerminalStatusLabel(terminal.session, terminal.isLoadingSession)}
                    </span>
                </div>

                <AdminXtermTerminal
                    terminalId={terminal.session?.id || task.id}
                    output={terminal.session?.output || ''}
                    emptyState={
                        terminal.isLoadingSession
                            ? 'Connecting to the task terminal…'
                            : 'No terminal output has been captured for this task on this server instance yet.'
                    }
                    isRunning={Boolean(terminal.session?.isRunning)}
                    isReadOnly
                    isPlainTextOutput
                    ariaLabel={`Read-only terminal of task ${task.id}`}
                />

                <p className="text-xs text-slate-500">
                    The terminal shows output captured while the task is processed by this server instance; output
                    produced before the last server restart is not available.
                </p>
            </div>
        </Dialog>
    );
}
