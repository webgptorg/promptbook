'use client';

import { AlertTriangle } from 'lucide-react';
import { AdminTerminalCard } from '../../../components/AdminTerminal/AdminTerminalCard';
import { useAdminTerminalSession } from '../../../components/AdminTerminal/useAdminTerminalSession';

/**
 * Browser-safe snapshot of one raw CLI access session.
 */
type CliAccessSession = {
    readonly id: string;
    readonly title: string;
    readonly shell: string;
    readonly workingDirectory: string;
    readonly isRunning: boolean;
    readonly output: string;
    readonly startedAt: string;
    readonly finishedAt: string | null;
    readonly exitCode: number | null;
    readonly signal: string | null;
};

/**
 * Super-admin UI for the unrestricted standalone VPS shell.
 */
export function CliAccessClient() {
    const terminal = useAdminTerminalSession<CliAccessSession>({
        basePath: '/api/admin/cli-access',
        loadErrorMessage: 'Failed to load the CLI access session.',
        startErrorMessage: 'Failed to start the CLI access session.',
        sendErrorMessage: 'Failed to send CLI access input.',
        stopErrorMessage: 'Failed to stop the CLI access session.',
        startSuccessMessage: 'CLI access terminal started.',
        finishSuccessMessage: 'CLI access session finished.',
        finishErrorMessage: 'CLI access session ended with an error.',
        isAutoStartEnabled: true,
    });

    return (
        <div className="container mx-auto space-y-6 px-4 py-8">
            <div className="mt-20">
                <h1 className="text-3xl font-light text-gray-900">CLI Access</h1>
                <p className="mt-1 max-w-4xl text-sm text-gray-500">
                    Open the live server shell directly in the Agents Server UI and run raw commands with the same
                    permissions as the running Agents Server process.
                </p>
            </div>

            {terminal.errorMessage ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {terminal.errorMessage}
                </div>
            ) : null}
            {terminal.successMessage ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {terminal.successMessage}
                </div>
            ) : null}

            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 flex-none" />
                    <div className="space-y-1">
                        <p className="font-semibold">Super-admin only</p>
                        <p>
                            This terminal is intentionally unrestricted. Every command runs directly on the server as the
                            same operating-system user that runs the Agents Server.
                        </p>
                    </div>
                </div>
            </div>

            <AdminTerminalCard
                title="Raw server shell"
                description="Start one shared shell session in the managed installation directory, run any command you need, and stop the session when you are done."
                hint={`Shell: ${terminal.session?.shell || 'bash'}${terminal.session?.workingDirectory ? ` • Working directory: ${terminal.session.workingDirectory}` : ''}`}
                session={terminal.session}
                onStart={() => void terminal.startSession()}
                onStop={() => void terminal.stopSession()}
                onSend={(input) => void terminal.sendInput(input)}
                isLoading={terminal.isLoadingSession}
                isStarting={terminal.isStarting}
                isSending={terminal.isSending}
                isStopping={terminal.isStopping}
                startLabel="Start CLI session"
                runningLabel="CLI session running"
                stopLabel="Stop session"
                outputLabel="Live shell output"
                outputEmptyState="No shell output yet. Start the CLI session to see the live server console here."
                quickActions={[
                    { label: 'Send Enter', input: '\n' },
                    { label: 'Send Ctrl+C', input: '\u0003' },
                ]}
            />
        </div>
    );
}
