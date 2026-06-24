import { NextResponse } from 'next/server';
import { isUserGlobalAdmin } from '@/src/utils/isUserGlobalAdmin';
import { listVpsSelfUpdateCandidateCommits } from '@/src/utils/vpsSelfUpdate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Lists candidate commits for the standalone VPS self-update custom-target picker.
 */
export async function GET(request: Request) {
    if (!(await isUserGlobalAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const requestUrl = new URL(request.url);
        const limitParameter = requestUrl.searchParams.get('limit');
        const parsedLimit = limitParameter ? Number.parseInt(limitParameter, 10) : null;

        const commits = await listVpsSelfUpdateCandidateCommits({
            searchText: requestUrl.searchParams.get('search'),
            authoredAfter: requestUrl.searchParams.get('after'),
            authoredBefore: requestUrl.searchParams.get('before'),
            limit: Number.isFinite(parsedLimit) ? parsedLimit : null,
        });

        return NextResponse.json({ commits });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to load candidate commits.' },
            { status: 500 },
        );
    }
}
