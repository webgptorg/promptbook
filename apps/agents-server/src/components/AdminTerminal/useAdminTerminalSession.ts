'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Minimal terminal-session shape used by the shared admin terminal hook.
 */
export type AdminTerminalSession = {
    /**
     * Session identifier.
     */
    readonly id: string;

    /**
     * Whether the terminal process is still running.
     */
    readonly isRunning: boolean;

    /**
     * Buffered terminal output.
     */
    readonly output: string;

    /**
     * ISO timestamp when the session started.
     */
    readonly startedAt: string;

    /**
     * ISO timestamp when the session finished.
     */
    readonly finishedAt: string | null;

    /**
     * Exit code when available.
     */
    readonly exitCode: number | null;

    /**
     * Exit signal when available.
     */
    readonly signal: string | null;
};

/**
 * Shared API response shape used by the admin terminal routes.
 */
type AdminTerminalSessionResponse<TSession extends AdminTerminalSession> = {
    /**
     * Loaded or updated session snapshot.
     */
    readonly session: TSession | null;

    /**
     * API error, when the request failed.
     */
    readonly error?: string;
};

/**
 * Options accepted by the shared admin terminal hook.
 */
type UseAdminTerminalSessionOptions = {
    /**
     * Base API route used for GET/POST/PATCH/DELETE requests.
     */
    readonly basePath: string;

    /**
     * Fallback error message used when loading the latest session fails.
     */
    readonly loadErrorMessage: string;

    /**
     * Fallback error message used when starting a new session fails.
     */
    readonly startErrorMessage: string;

    /**
     * Fallback error message used when sending input fails.
     */
    readonly sendErrorMessage: string;

    /**
     * Fallback error message used when stopping a session fails.
     */
    readonly stopErrorMessage: string;

    /**
     * Success message shown after starting a new session.
     */
    readonly startSuccessMessage: string;

    /**
     * Success message shown when the process exits with code `0`.
     */
    readonly finishSuccessMessage: string;

    /**
     * Error message shown when the process exits with a non-zero code.
     */
    readonly finishErrorMessage: string;

    /**
     * Whether the hook should start a session after the initial load finds none.
     */
    readonly isAutoStartEnabled?: boolean;
};

/**
 * Shared browser hook for admin pages that start, stream, write to, and stop one terminal session.
 *
 * @param options - API endpoints and user-facing messages for the terminal.
 * @returns Session state, status messages, and imperative helpers.
 */
export function useAdminTerminalSession<TSession extends AdminTerminalSession>(
    options: UseAdminTerminalSessionOptions,
) {
    const [session, setSession] = useState<TSession | null>(null);
    const [isLoadingSession, setIsLoadingSession] = useState(true);
    const [isStarting, setIsStarting] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isStopping, setIsStopping] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const hasAutoStartedReference = useRef(false);

    /**
     * Loads the latest session snapshot for the current terminal.
     */
    const loadSession = useCallback(async (): Promise<void> => {
        try {
            setIsLoadingSession(true);
            setErrorMessage(null);

            const response = await fetch(options.basePath, { cache: 'no-store' });
            const payload = (await response.json()) as AdminTerminalSessionResponse<TSession>;

            if (!response.ok) {
                throw new Error(payload.error || options.loadErrorMessage);
            }

            setSession(payload.session);
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : options.loadErrorMessage);
        } finally {
            setIsLoadingSession(false);
        }
    }, [options.basePath, options.loadErrorMessage]);

    useEffect(() => {
        void loadSession();
    }, [loadSession]);

    useEffect(() => {
        const sessionId = session?.id;
        if (!sessionId) {
            return;
        }

        const eventSource = new EventSource(`${options.basePath}?sessionId=${encodeURIComponent(sessionId)}&stream=1`);

        const handleSnapshot = (event: MessageEvent<string>) => {
            const payload = JSON.parse(event.data) as TSession;
            setSession(payload);
        };
        const handleOutput = (event: MessageEvent<string>) => {
            const payload = JSON.parse(event.data) as { readonly chunk: string };
            setSession((currentSession) => {
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
            const payload = JSON.parse(event.data) as TSession;
            setSession(payload);
            setIsStarting(false);
            setIsSending(false);
            setIsStopping(false);

            if (payload.exitCode === 0) {
                setSuccessMessage(options.finishSuccessMessage);
                setErrorMessage(null);
            } else {
                setSuccessMessage(null);
                setErrorMessage(options.finishErrorMessage);
            }

            eventSource.close();
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
    }, [options.basePath, options.finishErrorMessage, options.finishSuccessMessage, session?.id]);

    /**
     * Starts or reconnects to the managed terminal session.
     */
    const startSession = useCallback(async (): Promise<void> => {
        try {
            setIsStarting(true);
            setErrorMessage(null);
            setSuccessMessage(null);

            const response = await fetch(options.basePath, { method: 'POST' });
            const payload = (await response.json()) as AdminTerminalSessionResponse<TSession>;

            if (!response.ok || !payload.session) {
                throw new Error(payload.error || options.startErrorMessage);
            }

            setSession(payload.session);
            setSuccessMessage(options.startSuccessMessage);
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : options.startErrorMessage);
        } finally {
            setIsStarting(false);
        }
    }, [options.basePath, options.startErrorMessage, options.startSuccessMessage]);

    /**
     * Sends one raw input chunk to the running terminal session.
     *
     * @param nextInput - Raw text or control characters to write.
     */
    const sendInput = useCallback(
        async (nextInput: string): Promise<void> => {
            if (!session) {
                return;
            }

            try {
                setIsSending(true);
                setErrorMessage(null);

                const response = await fetch(options.basePath, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        sessionId: session.id,
                        input: nextInput,
                    }),
                });
                const payload = (await response.json()) as AdminTerminalSessionResponse<TSession>;

                if (!response.ok) {
                    throw new Error(payload.error || options.sendErrorMessage);
                }

                if (payload.session) {
                    setSession((currentSession) =>
                        mergeAdminTerminalSessionSnapshot(currentSession, payload.session as TSession),
                    );
                }
            } catch (error) {
                setErrorMessage(error instanceof Error ? error.message : options.sendErrorMessage);
            } finally {
                setIsSending(false);
            }
        },
        [options.basePath, options.sendErrorMessage, session],
    );

    /**
     * Stops the active terminal session.
     */
    const stopSession = useCallback(async (): Promise<void> => {
        if (!session) {
            return;
        }

        try {
            setIsStopping(true);
            setErrorMessage(null);

            const response = await fetch(options.basePath, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sessionId: session.id,
                }),
            });
            const payload = (await response.json()) as AdminTerminalSessionResponse<TSession>;

            if (!response.ok) {
                throw new Error(payload.error || options.stopErrorMessage);
            }

            if (payload.session) {
                setSession(payload.session);
            }
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : options.stopErrorMessage);
        } finally {
            setIsStopping(false);
        }
    }, [options.basePath, options.stopErrorMessage, session]);

    useEffect(() => {
        if (!options.isAutoStartEnabled || hasAutoStartedReference.current || isLoadingSession || session) {
            return;
        }

        hasAutoStartedReference.current = true;
        void startSession();
    }, [isLoadingSession, options.isAutoStartEnabled, session, startSession]);

    /**
     * Clears any terminal status messages shown above the panel.
     */
    const clearMessages = useCallback((): void => {
        setErrorMessage(null);
        setSuccessMessage(null);
    }, []);

    return {
        session,
        isLoadingSession,
        isStarting,
        isSending,
        isStopping,
        errorMessage,
        successMessage,
        setErrorMessage,
        setSuccessMessage,
        clearMessages,
        loadSession,
        startSession,
        sendInput,
        stopSession,
    };
}

/**
 * Merges a terminal API snapshot without letting a stale write acknowledgement hide newer SSE output.
 *
 * @private internal utility of `useAdminTerminalSession`
 */
export function mergeAdminTerminalSessionSnapshot<TSession extends AdminTerminalSession>(
    currentSession: TSession | null,
    nextSession: TSession,
): TSession {
    if (!currentSession || currentSession.id !== nextSession.id) {
        return nextSession;
    }

    const isStaleSessionOutput =
        currentSession.output.length > nextSession.output.length && currentSession.output.startsWith(nextSession.output);

    if (!isStaleSessionOutput) {
        return nextSession;
    }

    return {
        ...nextSession,
        output: currentSession.output,
    };
}
