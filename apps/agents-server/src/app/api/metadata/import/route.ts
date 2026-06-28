import { NextRequest, NextResponse } from 'next/server';
import { DatabaseError } from '../../../../../../../src/errors/DatabaseError';
import { ParseError } from '../../../../../../../src/errors/ParseError';
import { importMetadataConfigurationPayload } from '../../../../utils/metadataConfigurationTransfer';
import { isUserAdmin } from '../../../../utils/isUserAdmin';

/**
 * This route is always dynamic because it depends on live DB state and auth.
 */
export const dynamic = 'force-dynamic';

/**
 * Imports standalone server metadata JSON.
 *
 * Returns `401` for non-admin callers.
 */
export async function POST(request: NextRequest) {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let payload: unknown;

    try {
        payload = await request.json();
    } catch {
        return NextResponse.json({ error: 'Metadata import must be valid JSON.' }, { status: 400 });
    }

    try {
        const isDefaultResetSkipped = request.nextUrl.searchParams.get('isDefaultResetSkipped') === 'true';
        const importSummary = await importMetadataConfigurationPayload(payload, { isDefaultResetSkipped });
        return NextResponse.json(importSummary);
    } catch (error) {
        if (error instanceof ParseError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        if (error instanceof DatabaseError) {
            console.error('Metadata import database error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.error('Metadata import error:', error);
        return NextResponse.json({ error: 'Failed to import metadata.' }, { status: 500 });
    }
}
