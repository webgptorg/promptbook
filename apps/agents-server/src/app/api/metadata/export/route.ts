import { NextResponse } from 'next/server';
import { createMetadataConfigurationExport } from '../../../../utils/metadataConfigurationTransfer';
import { isUserAdmin } from '../../../../utils/isUserAdmin';

/**
 * This route is always dynamic because it depends on live DB state and auth.
 */
export const dynamic = 'force-dynamic';

/**
 * Serves the standalone server metadata JSON export.
 *
 * Returns `401` for non-admin callers.
 */
export async function GET() {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { filename, payload } = await createMetadataConfigurationExport();

        return new NextResponse(`${JSON.stringify(payload, null, 4)}\n`, {
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        console.error('Metadata export error:', error);
        return NextResponse.json({ error: 'Failed to export metadata.' }, { status: 500 });
    }
}
