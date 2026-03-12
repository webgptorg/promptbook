import { NextResponse } from 'next/server';
import { isUserAdmin } from '@/src/utils/isUserAdmin';
import { getToolUsageLimits, updateToolUsageLimits } from '@/src/utils/toolUsageLimits';

/**
 * Loads the normalized tool-usage limits configuration for administrators.
 */
export async function GET() {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        return NextResponse.json(await getToolUsageLimits());
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to load tool limits.' },
            { status: 500 },
        );
    }
}

/**
 * Updates the normalized tool-usage limits configuration for administrators.
 */
export async function PUT(request: Request) {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const payload = await request.json().catch(() => null);
        return NextResponse.json(await updateToolUsageLimits(payload));
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to update tool limits.' },
            { status: 500 },
        );
    }
}
