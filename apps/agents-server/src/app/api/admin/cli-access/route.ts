import { NextResponse } from 'next/server';
import { isUserGlobalAdmin } from '@/src/utils/isUserGlobalAdmin';
import { createInteractiveTerminalEventStream } from '@/src/utils/createInteractiveTerminalEventStream';
import {
    getLatestServerCliAccessSession,
    getServerCliAccessSession,
    startServerCliAccessSession,
    stopServerCliAccessSession,
    subscribeToServerCliAccessSession,
    writeServerCliAccessSessionInput,
} from '@/src/utils/serverCliAccess';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Loads the latest CLI access session or streams a specific terminal session.
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
                return NextResponse.json({ error: 'CLI access session id is required.' }, { status: 400 });
            }

            const session = getServerCliAccessSession(sessionId);
            if (!session) {
                return NextResponse.json({ error: 'CLI access session was not found.' }, { status: 404 });
            }

            return createInteractiveTerminalEventStream(
                request,
                sessionId,
                session,
                subscribeToServerCliAccessSession,
            );
        }

        return NextResponse.json({
            session: getLatestServerCliAccessSession(),
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to load the CLI access session.' },
            { status: 500 },
        );
    }
}

/**
 * Starts or reconnects to the raw server shell exposed in the browser.
 */
export async function POST() {
    if (!(await isUserGlobalAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        return NextResponse.json({
            session: await startServerCliAccessSession(),
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to start the CLI access session.' },
            { status: 500 },
        );
    }
}

/**
 * Sends raw input to the running CLI access shell.
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
            return NextResponse.json({ error: 'CLI access session input is required.' }, { status: 400 });
        }

        return NextResponse.json({
            session: writeServerCliAccessSessionInput(body.sessionId, body.input),
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to send CLI access input.' },
            { status: 500 },
        );
    }
}

/**
 * Stops one running CLI access shell session.
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
            return NextResponse.json({ error: 'CLI access session id is required.' }, { status: 400 });
        }

        return NextResponse.json({
            session: stopServerCliAccessSession(body.sessionId),
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to stop the CLI access session.' },
            { status: 500 },
        );
    }
}
