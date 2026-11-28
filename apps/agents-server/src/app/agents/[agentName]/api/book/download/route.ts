import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import {
    createAgentBookDownloadContentDisposition,
    createAgentBookDownloadFilename,
} from '@/src/utils/agentBook/createAgentBookDownloadFilename';
import { getCurrentUser } from '@/src/utils/getCurrentUser';
import { DatabaseError, NotFoundError, UnexpectedError } from '@promptbook-local/core';
import { NextResponse } from 'next/server';

/**
 * This route is always dynamic because it depends on live DB state and auth.
 */
export const dynamic = 'force-dynamic';

/**
 * Agent collection access requires the Node.js runtime.
 */
export const runtime = 'nodejs';

/**
 * Streams the stored source book for one authenticated local agent.
 *
 * @param _request - Incoming request.
 * @param context - Dynamic route params with the target agent name or permanent id.
 * @returns Downloadable `.book` response or JSON error payload.
 */
export async function GET(_request: Request, context: { params: Promise<{ agentName: string }> }) {
    if (!(await getCurrentUser())) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const agentIdentifier = decodeURIComponent((await context.params).agentName);
        const collection = await $provideAgentCollectionForServer();
        const [agentSource, agentProfile] = await Promise.all([
            collection.getAgentSource(agentIdentifier),
            collection.findAgentBasicInformation(agentIdentifier),
        ]);
        const filename = createAgentBookDownloadFilename(agentProfile?.agentName || agentIdentifier);

        return new NextResponse(agentSource, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Content-Disposition': createAgentBookDownloadContentDisposition(filename),
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        return createAgentBookDownloadErrorResponse(error);
    }
}

/**
 * Maps branded book download errors into HTTP JSON responses.
 *
 * @param error - Unknown thrown error.
 * @returns JSON error response.
 */
function createAgentBookDownloadErrorResponse(error: unknown): NextResponse {
    if (error instanceof NotFoundError) {
        return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof DatabaseError || error instanceof UnexpectedError) {
        console.error('Agent book download error:', error);
        return NextResponse.json({ error: 'Failed to download agent book.' }, { status: 500 });
    }

    console.error('Agent book download error:', error);
    return NextResponse.json({ error: 'Failed to download agent book.' }, { status: 500 });
}
