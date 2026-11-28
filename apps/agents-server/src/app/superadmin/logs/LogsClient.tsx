'use client';

import { Loader2, RefreshCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AdminXtermTerminal } from '../../../components/AdminTerminal/AdminXtermTerminal';

/**
 * API payload returned by the pm2 logs endpoint.
 */
type LogsResponse = {
    readonly isAvailable?: boolean;
    readonly output?: string;
    readonly error?: string;
};

/**
 * Client UI for recent pm2 log output.
 */
export function LogsClient() {
    const [logs, setLogs] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        void loadLogs();
    }, []);

    /**
     * Refreshes log output from the API.
     */
    async function loadLogs(): Promise<void> {
        try {
            setIsLoading(true);
            setErrorMessage(null);
            const response = await fetch('/api/admin/logs?lines=300', { cache: 'no-store' });
            const payload = (await response.json()) as LogsResponse;

            if (!response.ok) {
                throw new Error(payload.error || 'Failed to load logs.');
            }

            setLogs(payload.output || 'No log output returned.');
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to load logs.');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="container mx-auto space-y-6 px-4 py-8">
            <div className="mt-20 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-light text-gray-900">Logs</h1>
                    <p className="mt-1 text-sm text-gray-500">Recent pm2 output for the standalone Agents Server.</p>
                </div>
                <button
                    type="button"
                    onClick={() => void loadLogs()}
                    disabled={isLoading}
                    className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                    Refresh
                </button>
            </div>

            {errorMessage && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {errorMessage}
                </div>
            )}

            <AdminXtermTerminal
                terminalId="pm2-logs"
                output={logs}
                emptyState={isLoading && !logs ? 'Loading logs...' : 'No log output returned.'}
                isReadOnly
                isPlainTextOutput
                ariaLabel="Recent pm2 logs"
            />
        </div>
    );
}
