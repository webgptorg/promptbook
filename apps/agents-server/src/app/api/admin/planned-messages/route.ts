import { NextResponse } from 'next/server';
import { isUserAdmin } from '@/src/utils/isUserAdmin';
import { getPlannedMessageManagerResponse } from '@/src/utils/plannedMessageManager/getPlannedMessageManagerResponse';

/**
 * Lists every planned message of every agent for the admin planned-message manager.
 */
export async function GET() {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        return NextResponse.json(await getPlannedMessageManagerResponse());
    } catch (error) {
        console.error('[admin-planned-message] listing failed', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
