import { NextResponse } from 'next/server';
import { isUserAdmin } from '@/src/utils/isUserAdmin';
import { getServerLimits, updateServerLimits } from '@/src/utils/serverLimits';

/**
 * Loads the normalized dedicated server limits for administrators.
 */
export async function GET() {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        return NextResponse.json(await getServerLimits());
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to load server limits.' },
            { status: 500 },
        );
    }
}

/**
 * Updates the normalized dedicated server limits for administrators.
 */
export async function PUT(request: Request) {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const payload = await request.json().catch(() => null);
        return NextResponse.json(await updateServerLimits(payload));
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to update server limits.' },
            { status: 500 },
        );
    }
}
