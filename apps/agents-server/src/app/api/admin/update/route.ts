import { NextResponse } from 'next/server';
import { isUserGlobalAdmin } from '@/src/utils/isUserGlobalAdmin';
import { readVpsSelfUpdateOverview, startVpsSelfUpdate } from '@/src/utils/vpsSelfUpdate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Loads the current standalone VPS self-update overview for the super-admin UI.
 */
export async function GET() {
    if (!(await isUserGlobalAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        return NextResponse.json(await readVpsSelfUpdateOverview());
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to load the update overview.' },
            { status: 500 },
        );
    }
}

/**
 * Starts a detached standalone VPS self-update for the selected environment.
 */
export async function POST(request: Request) {
    if (!(await isUserGlobalAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = (await request.json().catch(() => null)) as
            | {
                  readonly environment?: string;
              }
            | null;

        if (!body?.environment || typeof body.environment !== 'string') {
            return NextResponse.json({ error: 'Update environment is required.' }, { status: 400 });
        }

        return NextResponse.json(await startVpsSelfUpdate(body.environment), { status: 202 });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to start the update.' },
            { status: 500 },
        );
    }
}
