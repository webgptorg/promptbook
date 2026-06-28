import { ParseError } from '@promptbook-local/core';
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
 * @param request - Export request with an optional `folderId` search parameter.
 * @returns ZIP response for admins or `401` for non-admin callers.
 */
export async function GET(request: Request) {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const folderId = parseAgentsExportFolderId(new URL(request.url).searchParams.get('folderId'));
        const { filename, stream } = await createAgentsExportZipStream({ folderId });
        const body = Readable.toWeb(stream as Readable) as ReadableStream<Uint8Array>;

        return new NextResponse(body, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        if (error instanceof ParseError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        console.error('Agents export error:', error);
        return NextResponse.json({ error: 'Failed to generate agents export.' }, { status: 500 });
    }
}

/**
 * Parses the optional folder scope for agents export.
 *
 * @param value - Raw `folderId` search parameter.
 * @returns Folder id or `undefined` for full-server exports.
 */
function parseAgentsExportFolderId(value: string | null): number | undefined {
    if (value === null || value === '' || value === 'null') {
        return undefined;
    }

    const parsedValue = Number(value);
    if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
        throw new ParseError(`Invalid export folder id \`${value}\`.`);
    }

    return parsedValue;
}
