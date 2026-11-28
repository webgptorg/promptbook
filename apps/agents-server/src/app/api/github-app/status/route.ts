import { getGithubAppConnectionStatusForUser } from '@/src/utils/githubApp';
import { resolveCurrentUserMemoryIdentity } from '@/src/utils/userMemory';
import { NextResponse } from 'next/server';

/**
 * Returns GitHub App configuration/connection status for current user.
 */
export async function GET() {
    const identity = await resolveCurrentUserMemoryIdentity();
    if (!identity) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const status = await getGithubAppConnectionStatusForUser(identity.userId);
        return NextResponse.json(status);
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to resolve GitHub App status.' },
            { status: 500 },
        );
    }
}
