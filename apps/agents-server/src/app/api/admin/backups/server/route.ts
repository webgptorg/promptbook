import { NextResponse } from 'next/server';
import { Readable } from 'node:stream';
import { createServerBackupZipStream } from '../../../../../utils/backup/createServerBackupZipStream';
import { isUserAdmin } from '../../../../../utils/isUserAdmin';

/**
 * This route is always dynamic because it depends on live DB state and auth.
 */
export const dynamic = 'force-dynamic';

/**
 * Streaming ZIP generation requires the Node.js runtime.
 */
export const runtime = 'nodejs';

/**
 * Streams one ZIP backup containing the selected server sections.
 *
 * Returns `401` for non-admin callers.
 */
export async function GET(request: Request) {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const requestedSectionKeys = new URL(request.url).searchParams.getAll('section');
        const { filename, stream } = await createServerBackupZipStream(requestedSectionKeys);
        const body = Readable.toWeb(stream as Readable) as ReadableStream<Uint8Array>;

        return new NextResponse(body, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        console.error('Server backup export error:', error);
        return NextResponse.json({ error: 'Failed to generate backup export.' }, { status: 500 });
    }
}
