import { NextResponse } from 'next/server';
import { isUserGlobalAdmin } from '@/src/utils/isUserGlobalAdmin';
import {
    getCodeRunnerAuthenticationSession,
    getLatestCodeRunnerAuthenticationSession,
    startCodeRunnerAuthenticationSession,
    stopCodeRunnerAuthenticationSession,
    subscribeToCodeRunnerAuthenticationSession,
    writeCodeRunnerAuthenticationSessionInput,
} from '@/src/utils/codeRunnerAuthentication';
import { readConfiguredCodeRunner } from '@/src/utils/codeRunnerConfiguration';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Loads the latest authentication session for the saved runner or streams a specific session.
 */
export async function GET(request: Request) {
    if (!(await isUserGlobalAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const sessionId = searchParams.get('sessionId')?.trim() || '';
        const isStreamRequested = searchParams.get('stream') === '1';

        if (isStreamRequested) {
            if (!sessionId) {
                return NextResponse.json({ error: 'Authentication session id is required.' }, { status: 400 });
            }

            const session = getCodeRunnerAuthenticationSession(sessionId);
            if (!session) {
                return NextResponse.json({ error: 'Authentication session was not found.' }, { status: 404 });
            }

            return createCodeRunnerAuthenticationEventStream(request, sessionId, session);
        }

        const { agent } = await readConfiguredCodeRunner();
        return NextResponse.json({
            session: getLatestCodeRunnerAuthenticationSession(agent),
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to load the authentication session.' },
            { status: 500 },
        );
    }
}

/**
 * Starts a new browser-driven authentication terminal for the saved runner.
 */
export async function POST() {
    if (!(await isUserGlobalAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { agent } = await readConfiguredCodeRunner();
        return NextResponse.json({
            session: await startCodeRunnerAuthenticationSession(agent),
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to start the authentication session.' },
            { status: 500 },
        );
    }
}

/**
 * Sends terminal input to a running authentication session.
 */
export async function PATCH(request: Request) {
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
            return NextResponse.json({ error: 'Authentication session input is required.' }, { status: 400 });
        }

        return NextResponse.json({
            session: writeCodeRunnerAuthenticationSessionInput(body.sessionId, body.input),
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to send authentication input.' },
            { status: 500 },
        );
    }
}

/**
 * Stops one authentication terminal from the admin UI.
 */
export async function DELETE(request: Request) {
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
            return NextResponse.json({ error: 'Authentication session id is required.' }, { status: 400 });
        }

        return NextResponse.json({
            session: stopCodeRunnerAuthenticationSession(body.sessionId),
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to stop the authentication session.' },
            { status: 500 },
        );
    }
}

/**
 * Creates one SSE response that replays buffered output and then streams live terminal events.
 *
 * @param request - Browser stream request.
 * @param sessionId - Authentication session id.
 * @param session - Existing session snapshot.
 * @returns Event stream response.
 */
function createCodeRunnerAuthenticationEventStream(
    request: Request,
    sessionId: string,
    session: NonNullable<ReturnType<typeof getCodeRunnerAuthenticationSession>>,
): Response {
    const encoder = new TextEncoder();

    return new Response(
        new ReadableStream({
            start(controller) {
                const emitEvent = (event: string, payload: unknown) => {
                    controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`));
                };

                emitEvent('snapshot', session);

                if (!session.isRunning) {
                    controller.close();
                    return;
                }

                const unsubscribe = subscribeToCodeRunnerAuthenticationSession(sessionId, {
                    onOutput: ({ chunk }) => emitEvent('output', { chunk }),
                    onExit: ({ snapshot: nextSession }) => {
                        emitEvent('exit', nextSession);
                        unsubscribe?.();
                        controller.close();
                    },
                });

                if (!unsubscribe) {
                    controller.error(new Error('Authentication session was not found.'));
                    return;
                }

                request.signal.addEventListener(
                    'abort',
                    () => {
                        unsubscribe();
                        controller.close();
                    },
                    { once: true },
                );
            },
        }),
        {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                Connection: 'keep-alive',
            },
        },
    );
}
