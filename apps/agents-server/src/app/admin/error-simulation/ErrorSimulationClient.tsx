'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import spaceTrim from 'spacetrim';
import { NotAllowed } from '../../../../../../src/errors/NotAllowed';
import { Card } from '../../../components/Homepage/Card';

/**
 * API endpoint for server-side error simulation modes.
 */
const ERROR_SIMULATION_API_PATH = '/api/admin/error-simulation';

/**
 * Query-string mode that intentionally crashes this page during server render.
 */
const SERVER_RENDER_THROW_MODE = 'server-render-throw';

/**
 * Direct route used for server-render boundary simulation.
 */
const SERVER_BOUNDARY_SIMULATION_URL = `/admin/error-simulation?mode=${SERVER_RENDER_THROW_MODE}`;

/**
 * Duration in milliseconds before a toast notification auto-dismisses.
 */
const TOAST_LIFETIME_MS = 6000;

/**
 * Server modes supported by the error simulation API.
 */
type ServerSimulationMode = 'success' | 'handled-500' | 'unhandled-throw' | 'invalid-json';

/**
 * Inline status block variants rendered inside the page content.
 */
type InlineStatusVariant = 'success' | 'error';

/**
 * Inline status details rendered under the simulation controls.
 */
type InlineStatus = {
    /**
     * Status semantic variant.
     */
    readonly variant: InlineStatusVariant;
    /**
     * Human-friendly status title.
     */
    readonly title: string;
    /**
     * Detailed status description.
     */
    readonly detail: string;
};

/**
 * Toast notification variants rendered in the top-right stack.
 */
type ToastVariant = 'info' | 'error';

/**
 * Local toast notification model used by this testing page.
 */
type ToastNotification = {
    /**
     * Stable identifier used for list rendering and dismissal.
     */
    readonly id: string;
    /**
     * Status semantic variant.
     */
    readonly variant: ToastVariant;
    /**
     * Human-friendly status title.
     */
    readonly title: string;
    /**
     * Detailed status description.
     */
    readonly detail: string;
};

/**
 * Creates a unique identifier for a local toast notification.
 *
 * @returns Unique toast identifier string.
 */
function createToastId(): string {
    return `error-sim-${crypto.randomUUID()}`;
}

/**
 * Resolves a human-friendly message from an unknown error payload.
 *
 * @param error - Unknown error payload.
 * @returns Readable error description.
 */
function describeUnknownError(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
}

/**
 * Builds the API URL for a specific server simulation mode.
 *
 * @param mode - Requested server simulation mode.
 * @returns URL string for fetch requests.
 */
function getSimulationUrl(mode: ServerSimulationMode): string {
    const query = new URLSearchParams({ mode });
    return `${ERROR_SIMULATION_API_PATH}?${query.toString()}`;
}

/**
 * Extracts a useful error detail from a failed HTTP response.
 *
 * @param response - HTTP response returned by the simulation endpoint.
 * @returns Parsed response detail for logging in the UI.
 */
async function readSimulationErrorDetail(response: Response): Promise<string> {
    const responseText = await response.text();

    try {
        const parsed = JSON.parse(responseText) as {
            error?: unknown;
            mode?: unknown;
        };
        if (typeof parsed.error === 'string') {
            return parsed.error;
        }
        if (typeof parsed.mode === 'string') {
            return `Mode \`${parsed.mode}\` returned HTTP ${response.status}.`;
        }
    } catch {
        // Intentionally ignored because plain text responses are valid simulation output.
    }

    return responseText || `HTTP ${response.status} ${response.statusText}`;
}

/**
 * Hidden admin testing UI for simulating client/server failure scenarios.
 *
 * @returns Error simulation controls and output state.
 */
export function ErrorSimulationClient() {
    const [isRunning, setIsRunning] = useState<boolean>(false);
    const [inlineStatus, setInlineStatus] = useState<InlineStatus | null>(null);
    const [toasts, setToasts] = useState<ToastNotification[]>([]);
    const [shouldThrowClientBoundaryError, setShouldThrowClientBoundaryError] = useState<boolean>(false);
    const toastTimeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

    /**
     * Clears all pending toast timers when the page unmounts.
     */
    useEffect(() => {
        return () => {
            for (const timeoutHandle of toastTimeoutsRef.current) {
                clearTimeout(timeoutHandle);
            }
            toastTimeoutsRef.current = [];
        };
    }, []);

    if (shouldThrowClientBoundaryError) {
        throw new NotAllowed(
            spaceTrim(`
                [Error simulation] Intentional client-render failure was triggered on \`/admin/error-simulation\`.

                This crash is expected and exists only for validating the global error boundary and monitoring setup.
            `),
        );
    }

    /**
     * Enqueues a local toast notification and auto-dismisses it.
     *
     * @param toast - Notification details without the generated id.
     */
    const pushToast = (toast: Omit<ToastNotification, 'id'>): void => {
        const id = createToastId();

        setToasts((currentToasts) => [{ ...toast, id }, ...currentToasts]);

        const timeoutHandle = setTimeout(() => {
            setToasts((currentToasts) => currentToasts.filter((currentToast) => currentToast.id !== id));
        }, TOAST_LIFETIME_MS);
        toastTimeoutsRef.current.push(timeoutHandle);
    };

    /**
     * Runs a failure simulation and renders the resulting detail as an inline error state.
     *
     * @param title - Human-friendly scenario title.
     * @param runSimulation - Async simulation callback that returns the observed failure detail.
     */
    const runFailureSimulation = async (title: string, runSimulation: () => Promise<string>): Promise<void> => {
        setIsRunning(true);
        setInlineStatus(null);

        try {
            const failureDetail = await runSimulation();
            const detail = spaceTrim(`
                ${failureDetail}

                This failure was intentionally triggered from the admin simulation page.
            `);

            setInlineStatus({
                variant: 'error',
                title,
                detail,
            });
            pushToast({
                variant: 'error',
                title,
                detail: failureDetail,
            });
        } catch (error) {
            const detail = describeUnknownError(error);
            setInlineStatus({
                variant: 'error',
                title: `${title} simulation failed`,
                detail,
            });
            pushToast({
                variant: 'error',
                title: `${title} simulation failed`,
                detail,
            });
        } finally {
            setIsRunning(false);
        }
    };

    /**
     * Simulates a handled API 500 response that returns structured JSON.
     */
    const handleHandledServerErrorSimulation = async (): Promise<void> => {
        await runFailureSimulation('Handled API 500 response', async () => {
            const response = await fetch(getSimulationUrl('handled-500'));

            if (response.ok) {
                throw new NotAllowed('Expected a failing response, but received HTTP success.');
            }

            return readSimulationErrorDetail(response);
        });
    };

    /**
     * Simulates an unhandled server throw to validate logging and monitoring.
     */
    const handleUnhandledServerThrowSimulation = async (): Promise<void> => {
        await runFailureSimulation('Unhandled API throw', async () => {
            const response = await fetch(getSimulationUrl('unhandled-throw'));

            if (response.ok) {
                throw new NotAllowed('Expected an unhandled throw response, but received HTTP success.');
            }

            return readSimulationErrorDetail(response);
        });
    };

    /**
     * Simulates JSON parse failure on the client by requesting a plain-text failure payload.
     */
    const handleInvalidJsonSimulation = async (): Promise<void> => {
        await runFailureSimulation('Client JSON parse failure', async () => {
            const response = await fetch(getSimulationUrl('invalid-json'));

            if (response.ok) {
                throw new NotAllowed('Expected plain-text failure payload, but received HTTP success.');
            }

            try {
                await response.json();
                throw new NotAllowed('Expected `response.json()` to fail, but parsing unexpectedly succeeded.');
            } catch (error) {
                return `Client JSON parse error: ${describeUnknownError(error)}`;
            }
        });
    };

    /**
     * Simulates a rejected fetch promise using request abort.
     */
    const handleAbortedFetchSimulation = async (): Promise<void> => {
        await runFailureSimulation('Aborted fetch request', async () => {
            const abortController = new AbortController();
            const responsePromise = fetch(getSimulationUrl('success'), { signal: abortController.signal });
            abortController.abort();

            try {
                await responsePromise;
                throw new NotAllowed('Expected the request to abort, but fetch resolved successfully.');
            } catch (error) {
                return `Fetch rejection: ${describeUnknownError(error)}`;
            }
        });
    };

    /**
     * Simulates a local inline error state without server interaction.
     */
    const handleInlineErrorStateSimulation = (): void => {
        const detail = 'Intentional inline error state. Use this to validate local UI rendering and copy.';
        setInlineStatus({
            variant: 'error',
            title: 'Inline error state',
            detail,
        });
    };

    /**
     * Simulates a local toast-like error state without server interaction.
     */
    const handleToastStateSimulation = (): void => {
        pushToast({
            variant: 'error',
            title: 'Toast-style error',
            detail: 'Intentional toast-style error notification for UI verification.',
        });
    };

    /**
     * Simulates a successful endpoint call for quick sanity checks.
     */
    const handleSuccessSanityCheck = async (): Promise<void> => {
        setIsRunning(true);
        setInlineStatus(null);

        try {
            const response = await fetch(getSimulationUrl('success'));

            if (!response.ok) {
                const detail = await readSimulationErrorDetail(response);
                throw new NotAllowed(`Expected success response, received failure: ${detail}`);
            }

            const payload = (await response.json()) as { mode?: string; timestamp?: string };
            const detail = `Endpoint healthy in mode \`${payload.mode ?? 'unknown'}\` at ${payload.timestamp ?? 'n/a'}.`;

            setInlineStatus({
                variant: 'success',
                title: 'Sanity check passed',
                detail,
            });
            pushToast({
                variant: 'info',
                title: 'Sanity check passed',
                detail,
            });
        } catch (error) {
            const detail = describeUnknownError(error);
            setInlineStatus({
                variant: 'error',
                title: 'Sanity check failed',
                detail,
            });
            pushToast({
                variant: 'error',
                title: 'Sanity check failed',
                detail,
            });
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 space-y-6">
            <div className="mt-20 mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-3xl text-gray-900 font-light">Admin Error Simulation</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Hidden internal page for intentionally triggering failure paths in client and server flows.
                    </p>
                </div>
            </div>

            <Card>
                <div className="space-y-8">
                    <section className="space-y-3">
                        <h2 className="text-lg font-semibold text-gray-900">UI error states</h2>
                        <p className="text-sm text-gray-600">
                            Use these controls to verify inline errors, toast-style notifications, and error boundaries.
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={handleInlineErrorStateSimulation}
                                className="rounded bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600"
                            >
                                Simulate inline error
                            </button>
                            <button
                                onClick={handleToastStateSimulation}
                                className="rounded bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                            >
                                Simulate toast-style error
                            </button>
                            <button
                                onClick={() => setShouldThrowClientBoundaryError(true)}
                                className="rounded bg-red-700 px-3 py-2 text-sm font-semibold text-white hover:bg-red-800"
                            >
                                Trigger client error boundary
                            </button>
                            <Link
                                href={SERVER_BOUNDARY_SIMULATION_URL}
                                className="rounded bg-red-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black"
                            >
                                Trigger server error boundary
                            </Link>
                        </div>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-lg font-semibold text-gray-900">Server and fetch failures</h2>
                        <p className="text-sm text-gray-600">
                            Run failure scenarios to validate API error handling, fetch rejection behavior, and logging.
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={handleSuccessSanityCheck}
                                disabled={isRunning}
                                className="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Run success sanity check
                            </button>
                            <button
                                onClick={handleHandledServerErrorSimulation}
                                disabled={isRunning}
                                className="rounded bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Simulate handled API 500
                            </button>
                            <button
                                onClick={handleUnhandledServerThrowSimulation}
                                disabled={isRunning}
                                className="rounded bg-red-700 px-3 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Simulate unhandled API throw
                            </button>
                            <button
                                onClick={handleInvalidJsonSimulation}
                                disabled={isRunning}
                                className="rounded bg-orange-600 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Simulate JSON parse failure
                            </button>
                            <button
                                onClick={handleAbortedFetchSimulation}
                                disabled={isRunning}
                                className="rounded bg-slate-700 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Simulate aborted fetch
                            </button>
                        </div>
                    </section>

                    {inlineStatus ? (
                        <section
                            className={`rounded border px-4 py-3 ${
                                inlineStatus.variant === 'error'
                                    ? 'border-red-300 bg-red-50 text-red-900'
                                    : 'border-emerald-300 bg-emerald-50 text-emerald-900'
                            }`}
                            role="alert"
                        >
                            <p className="text-sm font-semibold">{inlineStatus.title}</p>
                            <p className="mt-1 text-sm whitespace-pre-wrap">{inlineStatus.detail}</p>
                        </section>
                    ) : null}
                </div>
            </Card>

            <div className="pointer-events-none fixed right-4 top-20 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
                {toasts.map((toast) => (
                    <article
                        key={toast.id}
                        className={`pointer-events-auto rounded border px-3 py-2 shadow ${
                            toast.variant === 'error'
                                ? 'border-red-300 bg-red-50 text-red-900'
                                : 'border-blue-300 bg-blue-50 text-blue-900'
                        }`}
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <p className="text-sm font-semibold">{toast.title}</p>
                                <p className="mt-1 text-xs">{toast.detail}</p>
                            </div>
                            <button
                                onClick={() =>
                                    setToasts((currentToasts) =>
                                        currentToasts.filter((currentToast) => currentToast.id !== toast.id),
                                    )
                                }
                                className="text-xs font-semibold underline"
                            >
                                Dismiss
                            </button>
                        </div>
                    </article>
                ))}
            </div>
        </div>
    );
}
