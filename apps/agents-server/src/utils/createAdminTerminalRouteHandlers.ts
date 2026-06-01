import { NextResponse } from 'next/server';
import { createInteractiveTerminalEventStream } from './createInteractiveTerminalEventStream';
import { isUserGlobalAdmin } from './isUserGlobalAdmin';
import type { InteractiveTerminalSessionSubscriber } from './interactiveTerminalSession';

/**
 * Minimal browser-safe terminal session shape handled by the shared admin API routes.
 */
type AdminTerminalRouteSession = {
    /**
     * Whether the terminal process is still active.
     */
    readonly isRunning: boolean;
};

/**
 * Browser stream callbacks accepted by one admin terminal route.
 */
type AdminTerminalRouteSubscriber<TSession extends AdminTerminalRouteSession> = {
    /**
     * Called whenever the terminal backend emits output.
     */
    readonly onOutput: InteractiveTerminalSessionSubscriber['onOutput'];

    /**
     * Called once the terminal backend exits.
     */
    readonly onExit: (event: { readonly type: 'exit'; readonly snapshot: TSession }) => void;
};

/**
 * Terminal backend operations provided by each specific admin terminal.
 */
type AdminTerminalRouteBackend<TSession extends AdminTerminalRouteSession> = {
    /**
     * Returns the latest session for the terminal purpose.
     */
    readonly getLatestSession: (request: Request) => Promise<TSession | null> | TSession | null;

    /**
     * Looks up one session by id.
     */
    readonly getSession: (sessionId: string) => Promise<TSession | null> | TSession | null;

    /**
     * Starts or reconnects to the terminal session.
     */
    readonly startSession: (request: Request) => Promise<TSession> | TSession;

    /**
     * Sends raw input to the terminal session.
     */
    readonly writeSessionInput: (sessionId: string, input: string) => Promise<TSession> | TSession;

    /**
     * Stops one terminal session.
     */
    readonly stopSession: (sessionId: string) => Promise<TSession> | TSession;

    /**
     * Subscribes one browser stream to live terminal events.
     */
    readonly subscribeToSession: (
        sessionId: string,
        subscriber: AdminTerminalRouteSubscriber<TSession>,
    ) => (() => void) | null;
};

/**
 * User-facing error messages used by the generated terminal route handlers.
 */
type AdminTerminalRouteMessages = {
    /**
     * Error used when loading the latest session fails.
     */
    readonly loadErrorMessage: string;

    /**
     * Error used when the stream request omits a session id.
     */
    readonly missingStreamSessionIdMessage: string;

    /**
     * Error used when the requested stream session does not exist.
     */
    readonly sessionNotFoundMessage: string;

    /**
     * Error used when starting a session fails.
     */
    readonly startErrorMessage: string;

    /**
     * Error used when the input request is malformed.
     */
    readonly missingInputMessage: string;

    /**
     * Error used when writing input fails.
     */
    readonly sendErrorMessage: string;

    /**
     * Error used when the stop request omits a session id.
     */
    readonly missingStopSessionIdMessage: string;

    /**
     * Error used when stopping a session fails.
     */
    readonly stopErrorMessage: string;
};

/**
 * Generated Next.js route handlers for one admin terminal endpoint.
 */
type AdminTerminalRouteHandlers = {
    /**
     * Loads the latest terminal session or streams a specific session.
     */
    readonly GET: (request: Request) => Promise<Response>;

    /**
     * Starts or reconnects to the terminal session.
     */
    readonly POST: (request: Request) => Promise<Response>;

    /**
     * Sends raw input to a running terminal session.
     */
    readonly PATCH: (request: Request) => Promise<Response>;

    /**
     * Stops one terminal session.
     */
    readonly DELETE: (request: Request) => Promise<Response>;
};

/**
 * Creates consistent admin terminal API handlers for GET/stream, POST, PATCH, and DELETE.
 *
 * @param backend - Terminal-specific backend operations.
 * @param messages - Terminal-specific error messages.
 * @returns Next.js route handlers ready to export from an API route.
 */
export function createAdminTerminalRouteHandlers<TSession extends AdminTerminalRouteSession>(
    backend: AdminTerminalRouteBackend<TSession>,
    messages: AdminTerminalRouteMessages,
): AdminTerminalRouteHandlers {
    return {
        async GET(request: Request): Promise<Response> {
            if (!(await isUserGlobalAdmin())) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }

            try {
                const { searchParams } = new URL(request.url);
                const sessionId = searchParams.get('sessionId')?.trim() || '';
                const isStreamRequested = searchParams.get('stream') === '1';

                if (isStreamRequested) {
                    if (!sessionId) {
                        return NextResponse.json({ error: messages.missingStreamSessionIdMessage }, { status: 400 });
                    }

                    const session = await backend.getSession(sessionId);
                    if (!session) {
                        return NextResponse.json({ error: messages.sessionNotFoundMessage }, { status: 404 });
                    }

                    return createInteractiveTerminalEventStream(
                        request,
                        sessionId,
                        session,
                        backend.subscribeToSession,
                    );
                }

                return NextResponse.json({
                    session: await backend.getLatestSession(request),
                });
            } catch (error) {
                return createAdminTerminalErrorResponse(error, messages.loadErrorMessage);
            }
        },

        async POST(request: Request): Promise<Response> {
            if (!(await isUserGlobalAdmin())) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }

            try {
                return NextResponse.json({
                    session: await backend.startSession(request),
                });
            } catch (error) {
                return createAdminTerminalErrorResponse(error, messages.startErrorMessage);
            }
        },

        async PATCH(request: Request): Promise<Response> {
            if (!(await isUserGlobalAdmin())) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }

            try {
                const body = (await request.json().catch(() => null)) as
                    | {
                          readonly sessionId?: string;
                          readonly input?: string;
                      }
                    | null;

                if (!body?.sessionId || typeof body.input !== 'string') {
                    return NextResponse.json({ error: messages.missingInputMessage }, { status: 400 });
                }

                return NextResponse.json({
                    session: await backend.writeSessionInput(body.sessionId, body.input),
                });
            } catch (error) {
                return createAdminTerminalErrorResponse(error, messages.sendErrorMessage);
            }
        },

        async DELETE(request: Request): Promise<Response> {
            if (!(await isUserGlobalAdmin())) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }

            try {
                const body = (await request.json().catch(() => null)) as
                    | {
                          readonly sessionId?: string;
                      }
                    | null;

                if (!body?.sessionId) {
                    return NextResponse.json({ error: messages.missingStopSessionIdMessage }, { status: 400 });
                }

                return NextResponse.json({
                    session: await backend.stopSession(body.sessionId),
                });
            } catch (error) {
                return createAdminTerminalErrorResponse(error, messages.stopErrorMessage);
            }
        },
    };
}

/**
 * Converts one thrown backend failure into a consistent JSON error response.
 *
 * @param error - Thrown backend error.
 * @param fallbackMessage - Message used when the thrown value is not an `Error`.
 * @returns JSON error response.
 */
function createAdminTerminalErrorResponse(error: unknown, fallbackMessage: string): Response {
    return NextResponse.json(
        { error: error instanceof Error ? error.message : fallbackMessage },
        { status: 500 },
    );
}
