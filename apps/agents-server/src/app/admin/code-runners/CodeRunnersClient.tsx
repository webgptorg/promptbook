'use client';

import { Loader2, Play, Save, Send, ServerCog, SquareTerminal } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
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
 * Authentication session API response.
 */
type CodeRunnerAuthenticationResponse = {
    readonly session: CodeRunnerAuthenticationSession | null;
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
    const [isStartingAuthentication, setIsStartingAuthentication] = useState(false);
    const [isSendingAuthenticationInput, setIsSendingAuthenticationInput] = useState(false);
    const [isStoppingAuthentication, setIsStoppingAuthentication] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [applyOutput, setApplyOutput] = useState<string | null>(null);
    const [authenticationSession, setAuthenticationSession] = useState<CodeRunnerAuthenticationSession | null>(null);
    const [authenticationInput, setAuthenticationInput] = useState('');
    const authenticationOutputReference = useRef<HTMLPreElement | null>(null);

    /**
     * Loads the latest saved-runner authentication session snapshot.
     */
    const loadAuthenticationSession = useCallback(async (): Promise<void> => {
        const response = await fetch('/api/admin/code-runners/authentication', { cache: 'no-store' });
        const payload = (await response.json()) as CodeRunnerAuthenticationResponse;

        if (!response.ok) {
            throw new Error(payload.error || 'Failed to load the authentication session.');
        }

        setAuthenticationSession(payload.session);
    }, []);

    /**
     * Loads current code-runner settings.
     */
    const loadConfiguration = useCallback(async (): Promise<void> => {
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

            await loadAuthenticationSession();
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to load code-runner configuration.');
        } finally {
            setIsLoading(false);
        }
    }, [loadAuthenticationSession]);

    useEffect(() => {
        void loadConfiguration();
    }, [loadConfiguration]);

    useEffect(() => {
        const sessionId = authenticationSession?.id;
        if (!sessionId) {
            return;
        }

        const eventSource = new EventSource(
            `/api/admin/code-runners/authentication?sessionId=${encodeURIComponent(sessionId)}&stream=1`,
        );

        const handleSnapshot = (event: MessageEvent<string>) => {
            const payload = JSON.parse(event.data) as CodeRunnerAuthenticationSession;
            setAuthenticationSession(payload);
        };
        const handleOutput = (event: MessageEvent<string>) => {
            const payload = JSON.parse(event.data) as { readonly chunk: string };
            setAuthenticationSession((currentSession) => {
                if (!currentSession || currentSession.id !== sessionId) {
                    return currentSession;
                }

                return {
                    ...currentSession,
                    output: currentSession.output + payload.chunk,
                };
            });
        };
        const handleExit = (event: MessageEvent<string>) => {
            const payload = JSON.parse(event.data) as CodeRunnerAuthenticationSession;
            setAuthenticationSession(payload);
            setIsStartingAuthentication(false);
            setIsSendingAuthenticationInput(false);
            setIsStoppingAuthentication(false);

            if (payload.exitCode === 0) {
                setSuccessMessage('Runner authentication finished.');
            } else {
                setErrorMessage('Runner authentication session ended with an error.');
            }

            eventSource.close();
            void loadConfiguration();
        };

        eventSource.addEventListener('snapshot', handleSnapshot as EventListener);
        eventSource.addEventListener('output', handleOutput as EventListener);
        eventSource.addEventListener('exit', handleExit as EventListener);
        eventSource.onerror = () => {
            eventSource.close();
        };

        return () => {
            eventSource.close();
        };
    }, [authenticationSession?.id, loadConfiguration]);

    useEffect(() => {
        if (!authenticationOutputReference.current) {
            return;
        }

        authenticationOutputReference.current.scrollTop = authenticationOutputReference.current.scrollHeight;
    }, [authenticationSession?.output]);

    const authenticationHint =
        AUTHENTICATION_HINTS[agent] ||
        'Start the terminal, complete the runner authentication flow there, and exit the CLI when the runner is ready.';

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

    /**
     * Starts or reconnects to the saved-runner authentication terminal.
     */
    async function startAuthenticationSession(): Promise<void> {
        try {
            setIsStartingAuthentication(true);
            setErrorMessage(null);
            setSuccessMessage(null);

            const response = await fetch('/api/admin/code-runners/authentication', {
                method: 'POST',
            });
            const payload = (await response.json()) as CodeRunnerAuthenticationResponse;

            if (!response.ok || !payload.session) {
                throw new Error(payload.error || 'Failed to start the authentication session.');
            }

            setAuthenticationSession(payload.session);
            setSuccessMessage('Runner authentication terminal started.');
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to start the authentication session.');
        } finally {
            setIsStartingAuthentication(false);
        }
    }

    /**
     * Sends one line of text to the running authentication terminal.
     */
    async function sendAuthenticationInput(input: string): Promise<void> {
        if (!authenticationSession) {
            return;
        }

        try {
            setIsSendingAuthenticationInput(true);
            setErrorMessage(null);

            const response = await fetch('/api/admin/code-runners/authentication', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sessionId: authenticationSession.id,
                    input,
                }),
            });
            const payload = (await response.json()) as CodeRunnerAuthenticationResponse;

            if (!response.ok) {
                throw new Error(payload.error || 'Failed to send authentication input.');
            }

            if (payload.session) {
                setAuthenticationSession(payload.session);
            }
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to send authentication input.');
        } finally {
            setIsSendingAuthenticationInput(false);
        }
    }

    /**
     * Stops the active authentication terminal.
     */
    async function stopAuthenticationSession(): Promise<void> {
        if (!authenticationSession) {
            return;
        }

        try {
            setIsStoppingAuthentication(true);
            setErrorMessage(null);

            const response = await fetch('/api/admin/code-runners/authentication', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sessionId: authenticationSession.id,
                }),
            });
            const payload = (await response.json()) as CodeRunnerAuthenticationResponse;

            if (!response.ok) {
                throw new Error(payload.error || 'Failed to stop the authentication session.');
            }

            if (payload.session) {
                setAuthenticationSession(payload.session);
            }
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to stop the authentication session.');
        } finally {
            setIsStoppingAuthentication(false);
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

            <Card className="hover:border-gray-200 hover:shadow-md">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <h2 className="text-lg font-semibold text-slate-900">Authentication</h2>
                        <p className="text-sm text-slate-600">
                            Save runner changes first if you want to authenticate a different CLI, then start the saved-runner
                            terminal here instead of SSHing into the VPS.
                        </p>
                        <p className="text-sm text-slate-600">{authenticationHint}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={() => void startAuthenticationSession()}
                            disabled={isLoading || isSaving || isStartingAuthentication || authenticationSession?.isRunning}
                            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isStartingAuthentication ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Play className="h-4 w-4" />
                            )}
                            {authenticationSession?.isRunning ? 'Authentication running' : 'Authenticate saved runner'}
                        </button>
                        <button
                            type="button"
                            onClick={() => void stopAuthenticationSession()}
                            disabled={!authenticationSession?.isRunning || isStoppingAuthentication}
                            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isStoppingAuthentication ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <SquareTerminal className="h-4 w-4" />
                            )}
                            Stop terminal
                        </button>
                    </div>

                    <pre className="max-h-64 overflow-auto rounded-xl border border-slate-200 bg-slate-950 p-4 text-xs text-slate-100">
                        {status || 'Runner status was not available.'}
                    </pre>

                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h3 className="text-sm font-semibold text-slate-700">Live authentication terminal</h3>
                            {authenticationSession ? (
                                <span className="text-xs text-slate-500">
                                    {authenticationSession.isRunning
                                        ? 'Running'
                                        : authenticationSession.exitCode === 0
                                          ? 'Finished successfully'
                                          : 'Finished with an error'}
                                </span>
                            ) : (
                                <span className="text-xs text-slate-500">No session started yet.</span>
                            )}
                        </div>
                        <pre
                            ref={authenticationOutputReference}
                            className="max-h-96 overflow-auto rounded-xl border border-slate-200 bg-slate-950 p-4 text-xs text-slate-100"
                        >
                            {authenticationSession?.output ||
                                'No authentication session output yet. Start the saved-runner terminal to see the live authentication log here.'}
                        </pre>
                    </div>

                    <form
                        className="flex flex-col gap-3 md:flex-row"
                        onSubmit={(event) => {
                            event.preventDefault();

                            if (!authenticationInput.trim()) {
                                return;
                            }

                            const input = authenticationInput.endsWith('\n')
                                ? authenticationInput
                                : `${authenticationInput}\n`;

                            void sendAuthenticationInput(input);
                            setAuthenticationInput('');
                        }}
                    >
                        <input
                            type="text"
                            value={authenticationInput}
                            onChange={(event) => setAuthenticationInput(event.target.value)}
                            disabled={!authenticationSession?.isRunning || isSendingAuthenticationInput}
                            placeholder="Type a terminal command such as /login and send it to the running runner CLI"
                            className={INPUT_CLASS_NAME}
                        />
                        <div className="flex gap-3">
                            <button
                                type="submit"
                                disabled={
                                    !authenticationSession?.isRunning ||
                                    isSendingAuthenticationInput ||
                                    authenticationInput.trim() === ''
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isSendingAuthenticationInput ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="h-4 w-4" />
                                )}
                                Send
                            </button>
                            <button
                                type="button"
                                onClick={() => void sendAuthenticationInput('\n')}
                                disabled={!authenticationSession?.isRunning || isSendingAuthenticationInput}
                                className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Send Enter
                            </button>
                        </div>
                    </form>
                </div>
            </Card>
        </div>
    );
}
