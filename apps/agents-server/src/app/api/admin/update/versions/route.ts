import { NextResponse } from 'next/server';
import { isUserGlobalAdmin } from '@/src/utils/isUserGlobalAdmin';
import { deleteVpsSelfUpdateInstalledVersion, readVpsSelfUpdateOverview } from '@/src/utils/vpsSelfUpdate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Deletes one old installed Agents Server version from the standalone VPS releases directory.
 */
export async function DELETE(request: Request) {
    if (!(await isUserGlobalAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = (await request.json().catch(() => null)) as {
            readonly versionName?: string;
        } | null;

        if (!body?.versionName || typeof body.versionName !== 'string') {
            return NextResponse.json({ error: 'Version name is required.' }, { status: 400 });
        }

        await deleteVpsSelfUpdateInstalledVersion(body.versionName);

        return NextResponse.json(await readVpsSelfUpdateOverview());
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to delete the installed version.' },
            { status: 500 },
        );
    }
}
