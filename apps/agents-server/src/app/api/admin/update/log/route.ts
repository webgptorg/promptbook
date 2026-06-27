import { basename } from 'path';
import { NextResponse } from 'next/server';
import { isUserGlobalAdmin } from '@/src/utils/isUserGlobalAdmin';
import { readVpsSelfUpdateLogFileContent, resolveVpsSelfUpdateLogFilePath } from '@/src/utils/vpsSelfUpdate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Streams the full persisted standalone VPS self-update log so the super-admin UI can copy or download it
 * for sharing with the developers when a self-update fails.
 */
export async function GET() {
    if (!(await isUserGlobalAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const logFileContent = await readVpsSelfUpdateLogFileContent();
        if (logFileContent === null) {
            return NextResponse.json(
                { error: 'The standalone VPS self-update log file does not exist yet.' },
                { status: 404 },
            );
        }

        const logFileName = basename(resolveVpsSelfUpdateLogFilePath());
        return new NextResponse(logFileContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Content-Disposition': `attachment; filename="${logFileName}"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to load the self-update log file.' },
            { status: 500 },
        );
    }
}
