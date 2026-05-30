'use client';

import { Loader2, Save, ServerCog } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { AdminTerminalCard } from '../../../components/AdminTerminal/AdminTerminalCard';
import { useAdminTerminalSession } from '../../../components/AdminTerminal/useAdminTerminalSession';
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
 * Browser-safe snapshot of one authentication terminal session.
 */
type CodeRunnerAuthenticationSession = {
    readonly id: string;
    readonly agent: string;
    readonly isRunning: boolean;
    readonly output: string;
    readonly startedAt: string;
    readonly finishedAt: string | null;
    readonly exitCode: number | null;
    readonly signal: string | null;
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
 * Contextual UI copy for the runner authentication terminal.
 */
const AUTHENTICATION_HINTS: Record<string, string> = {
    'github-copilot':
        'Start the terminal, run `/login` if Copilot asks for it, trust the installation directory, and exit the CLI once the signed-in status is shown.',
    'openai-codex':
        'Start the terminal and follow the Codex CLI login flow there. Paste any prompted device or browser code in your browser, then exit the CLI when authentication succeeds.',
    'claude-code':
        'Start the terminal and complete the Claude Code login or project-trust prompts directly in the embedded terminal, then exit the CLI once it is ready.',
    opencode:
        'Start the terminal and complete the Opencode authentication flow directly there, including any browser/device confirmation, then exit the CLI.',
    gemini:
        'Start the terminal and complete the Gemini CLI authentication prompts there, then exit the CLI after it confirms that the runner is ready.',
};

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
    const [configurationErrorMessage, setConfigurationErrorMessage] = useState<string | null>(null);
    const [configurationSuccessMessage, setConfigurationSuccessMessage] = useState<string | null>(null);
    const [applyOutput, setApplyOutput] = useState<string | null>(null);
    const authenticationTerminal = useAdminTerminalSession<CodeRunnerAuthenticationSession>({
        basePath: '/api/admin/code-runners/authentication',
        loadErrorMessage: 'Failed to load the authentication session.',
        startErrorMessage: 'Failed to start the authentication session.',
        sendErrorMessage: 'Failed to send authentication input.',
        stopErrorMessage: 'Failed to stop the authentication session.',
        startSuccessMessage: 'Runner authentication terminal started.',
        finishSuccessMessage: 'Runner authentication finished.',
        finishErrorMessage: 'Runner authentication session ended with an error.',
    });
    const {
        session: authenticationSession,
        input: authenticationInput,
        setInput: setAuthenticationInput,
        isStarting: isStartingAuthentication,
        isSending: isSendingAuthenticationInput,
        isStopping: isStoppingAuthentication,
        errorMessage: authenticationErrorMessage,
        successMessage: authenticationSuccessMessage,
        clearMessages: clearAuthenticationMessages,
        loadSession: loadAuthenticationSession,
        startSession: startAuthenticationSession,
        sendInput: sendAuthenticationInput,
        stopSession: stopAuthenticationSession,
    } = authenticationTerminal;
    const authenticationHint =
        AUTHENTICATION_HINTS[agent] ||
        'Start the terminal, complete the runner authentication flow there, and exit the CLI when the runner is ready.';
    const errorMessage = configurationErrorMessage ?? authenticationErrorMessage;
    const successMessage = configurationSuccessMessage ?? authenticationSuccessMessage;

    /**
     * Loads current code-runner settings.
     */
    const loadConfiguration = useCallback(async (): Promise<void> => {
        try {
            setIsLoading(true);
            setConfigurationErrorMessage(null);

            const response = await fetch('/api/admin/code-runners', { cache: 'no-store' });
            const payload = (await response.json()) as CodeRunnersResponse;

            if (!response.ok) {
                throw new Error(payload.error || 'Failed to load code-runner configuration.');
            }

            setAgent(payload.agent || 'github-copilot');
            setModel(payload.model || 'gpt-5.4');
            setThinkingLevel(payload.thinkingLevel || 'xhigh');
            setStatus(payload.status || '');

            await loadAuthenticationSession();
        } catch (error) {
            setConfigurationErrorMessage(
                error instanceof Error ? error.message : 'Failed to load code-runner configuration.',
            );
        } finally {
            setIsLoading(false);
        }
    }, [loadAuthenticationSession]);

    useEffect(() => {
        void loadConfiguration();
    }, [loadConfiguration]);

    useEffect(() => {
        if (!authenticationSession?.finishedAt) {
            return;
        }

        void loadConfiguration();
    }, [authenticationSession?.finishedAt, loadConfiguration]);

    /**
     * Saves code-runner settings into `.env`.
     */
    async function saveConfiguration(applyRuntimeConfiguration: boolean): Promise<void> {
        try {
            setIsSaving(true);
            setConfigurationErrorMessage(null);
            setConfigurationSuccessMessage(null);
            clearAuthenticationMessages();
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
            setConfigurationSuccessMessage(
                applyRuntimeConfiguration
                    ? 'Code-runner configuration was saved and applied.'
                    : 'Code-runner configuration was saved.',
            );
        } catch (error) {
            setConfigurationErrorMessage(
                error instanceof Error ? error.message : 'Failed to save code-runner configuration.',
            );
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
                            disabled={isLoading || isSaving || isStartingAuthentication}
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
                            disabled={isLoading || isSaving || isStartingAuthentication}
                            className={INPUT_CLASS_NAME}
                        />
                    </label>
                    <label className="space-y-2">
                        <span className="text-sm font-semibold text-slate-700">Thinking level</span>
                        <input
                            type="text"
                            value={thinkingLevel}
                            onChange={(event) => setThinkingLevel(event.target.value)}
                            disabled={isLoading || isSaving || isStartingAuthentication}
                            className={INPUT_CLASS_NAME}
                        />
                    </label>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={() => void saveConfiguration(false)}
                        disabled={isLoading || isSaving || isStartingAuthentication}
                        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save runner
                    </button>
                    <button
                        type="button"
                        onClick={() => void saveConfiguration(true)}
                        disabled={isLoading || isSaving || isStartingAuthentication}
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

            <AdminTerminalCard
                title="Authentication"
                description="Save runner changes first if you want to authenticate a different CLI, then start the saved-runner terminal here instead of SSHing into the VPS."
                hint={authenticationHint}
                session={authenticationSession}
                input={authenticationInput}
                onInputChange={setAuthenticationInput}
                onStart={() => void startAuthenticationSession()}
                onStop={() => void stopAuthenticationSession()}
                onSend={(input) => void sendAuthenticationInput(input)}
                isLoading={isLoading}
                isStarting={isStartingAuthentication}
                isSending={isSendingAuthenticationInput}
                isStopping={isStoppingAuthentication}
                startLabel="Authenticate saved runner"
                runningLabel="Authentication running"
                stopLabel="Stop terminal"
                outputLabel="Live authentication terminal"
                outputEmptyState="No authentication session output yet. Start the saved-runner terminal to see the live authentication log here."
                inputPlaceholder="Type a terminal command such as /login and send it to the running runner CLI"
                quickActions={[{ label: 'Send Enter', input: '\n' }]}
            >
                <pre className="max-h-64 overflow-auto rounded-xl border border-slate-200 bg-slate-950 p-4 text-xs text-slate-100">
                    {status || 'Runner status was not available.'}
                </pre>
            </AdminTerminalCard>
        </div>
    );
}
