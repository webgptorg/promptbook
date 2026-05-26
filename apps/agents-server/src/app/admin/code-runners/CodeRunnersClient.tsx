'use client';

import { Loader2, Save, ServerCog } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Card } from '../../../components/Homepage/Card';

/**
 * Code-runner API response.
 */
type CodeRunnersResponse = {
    readonly agent?: string;
    readonly model?: string;
    readonly thinkingLevel?: string;
    readonly status?: string;
    readonly applyResult?: {
        readonly isAvailable: boolean;
        readonly output: string;
    } | null;
    readonly error?: string;
};

/**
 * Supported runner options shown by the standalone UI.
 */
const RUNNER_OPTIONS = [
    { value: 'github-copilot', label: 'GitHub Copilot' },
    { value: 'openai-codex', label: 'OpenAI Codex' },
    { value: 'claude-code', label: 'Claude Code' },
    { value: 'opencode', label: 'Opencode' },
    { value: 'gemini', label: 'Gemini' },
] as const;

/**
 * Shared input styling for code-runner controls.
 */
const INPUT_CLASS_NAME =
    'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50 disabled:text-gray-500';

/**
 * Client UI for configuring the local coding runner used by durable chats.
 */
export function CodeRunnersClient() {
    const [agent, setAgent] = useState('github-copilot');
    const [model, setModel] = useState('gpt-5.4');
    const [thinkingLevel, setThinkingLevel] = useState('xhigh');
    const [status, setStatus] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [applyOutput, setApplyOutput] = useState<string | null>(null);

    useEffect(() => {
        void loadConfiguration();
    }, []);

    /**
     * Loads current code-runner settings.
     */
    async function loadConfiguration(): Promise<void> {
        try {
            setIsLoading(true);
            setErrorMessage(null);
            const response = await fetch('/api/admin/code-runners', { cache: 'no-store' });
            const payload = (await response.json()) as CodeRunnersResponse;

            if (!response.ok) {
                throw new Error(payload.error || 'Failed to load code-runner configuration.');
            }

            setAgent(payload.agent || 'github-copilot');
            setModel(payload.model || 'gpt-5.4');
            setThinkingLevel(payload.thinkingLevel || 'xhigh');
            setStatus(payload.status || '');
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to load code-runner configuration.');
        } finally {
            setIsLoading(false);
        }
    }

    /**
     * Saves code-runner settings into `.env`.
     */
    async function saveConfiguration(applyRuntimeConfiguration: boolean): Promise<void> {
        try {
            setIsSaving(true);
            setErrorMessage(null);
            setSuccessMessage(null);
            setApplyOutput(null);

            const response = await fetch('/api/admin/code-runners', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ agent, model, thinkingLevel, applyRuntimeConfiguration }),
            });
            const payload = (await response.json()) as CodeRunnersResponse;

            if (!response.ok) {
                throw new Error(payload.error || 'Failed to save code-runner configuration.');
            }

            setAgent(payload.agent || agent);
            setModel(payload.model || model);
            setThinkingLevel(payload.thinkingLevel || thinkingLevel);
            setStatus(payload.status || '');
            setApplyOutput(payload.applyResult?.output || null);
            setSuccessMessage(
                applyRuntimeConfiguration
                    ? 'Code-runner configuration was saved and applied.'
                    : 'Code-runner configuration was saved.',
            );
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to save code-runner configuration.');
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div className="container mx-auto space-y-6 px-4 py-8">
            <div className="mt-20">
                <h1 className="text-3xl font-light text-gray-900">Code runners</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Configure the local runner used by the standalone Agents Server durable chat worker.
                </p>
            </div>

            {errorMessage && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {errorMessage}
                </div>
            )}
            {successMessage && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {successMessage}
                </div>
            )}

            <Card className="hover:border-gray-200 hover:shadow-md">
                <div className="grid gap-5 md:grid-cols-3">
                    <label className="space-y-2">
                        <span className="text-sm font-semibold text-slate-700">Runner</span>
                        <select
                            value={agent}
                            onChange={(event) => setAgent(event.target.value)}
                            disabled={isLoading || isSaving}
                            className={INPUT_CLASS_NAME}
                        >
                            {RUNNER_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="space-y-2">
                        <span className="text-sm font-semibold text-slate-700">Model</span>
                        <input
                            type="text"
                            value={model}
                            onChange={(event) => setModel(event.target.value)}
                            disabled={isLoading || isSaving}
                            className={INPUT_CLASS_NAME}
                        />
                    </label>
                    <label className="space-y-2">
                        <span className="text-sm font-semibold text-slate-700">Thinking level</span>
                        <input
                            type="text"
                            value={thinkingLevel}
                            onChange={(event) => setThinkingLevel(event.target.value)}
                            disabled={isLoading || isSaving}
                            className={INPUT_CLASS_NAME}
                        />
                    </label>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={() => void saveConfiguration(false)}
                        disabled={isLoading || isSaving}
                        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save runner
                    </button>
                    <button
                        type="button"
                        onClick={() => void saveConfiguration(true)}
                        disabled={isLoading || isSaving}
                        className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ServerCog className="h-4 w-4" />}
                        Save and apply runner
                    </button>
                </div>
            </Card>

            {applyOutput ? (
                <pre className="max-h-72 overflow-auto rounded-xl border border-slate-200 bg-slate-950 p-4 text-xs text-slate-100">
                    {applyOutput}
                </pre>
            ) : null}

            <Card className="hover:border-gray-200 hover:shadow-md">
                <div className="space-y-3">
                    <h2 className="text-lg font-semibold text-slate-900">Authentication</h2>
                    <p className="text-sm text-slate-600">
                        GitHub Copilot still requires an interactive CLI login and project trust setup on the VPS
                        terminal. Use <span className="font-mono">sudo -u $USER copilot</span>, run{' '}
                        <span className="font-mono">/login</span> when prompted, trust the install directory, then
                        restart the pm2 process.
                    </p>
                    <pre className="max-h-64 overflow-auto rounded-xl border border-slate-200 bg-slate-950 p-4 text-xs text-slate-100">
                        {status || 'Runner status was not available.'}
                    </pre>
                </div>
            </Card>
        </div>
    );
}
