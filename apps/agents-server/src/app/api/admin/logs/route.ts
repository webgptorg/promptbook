import { NextResponse } from 'next/server';
import { isUserGlobalAdmin } from '@/src/utils/isUserGlobalAdmin';
import { readVpsPm2Logs } from '@/src/utils/vpsConfiguration';

/**
 * Loads recent pm2 logs for the standalone Agents Server process.
 */
export async function GET(request: Request) {
    if (!(await isUserGlobalAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const url = new URL(request.url);
        const rawLines = Number.parseInt(url.searchParams.get('lines') || '200', 10);
        const lineCount = Number.isFinite(rawLines) ? Math.min(Math.max(rawLines, 20), 1000) : 200;
        return NextResponse.json(await readVpsPm2Logs(lineCount));
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to load pm2 logs.' },
            { status: 500 },
        );
    }
}
