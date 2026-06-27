import { NextResponse } from 'next/server';
import { Readable } from 'node:stream';
import { createAgentsExportZipStream } from '../../../../utils/agentsTransfer/createAgentsExportZipStream';
import { isUserAdmin } from '../../../../utils/isUserAdmin';

/**
 * This route is always dynamic because it depends on live DB state and auth.
 */
export const dynamic = 'force-dynamic';

/**
 * Streaming ZIP generation requires the Node.js runtime.
 */
export const runtime = 'nodejs';

/**
 * Streams an agents-only ZIP export containing book files in folder structure.
 *
 * @returns ZIP response for admins or `401` for non-admin callers.
 */
export async function GET() {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { filename, stream } = await createAgentsExportZipStream();
        const body = Readable.toWeb(stream as Readable) as ReadableStream<Uint8Array>;

        return new NextResponse(body, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        console.error('Agents export error:', error);
        return NextResponse.json({ error: 'Failed to generate agents export.' }, { status: 500 });
    }
}
