import {
    buildGithubAppInstallationConnectUrl,
    createGithubAppConnectionState,
    isGithubAppConfigured,
    normalizeGithubAppReturnToPath,
} from '@/src/utils/githubApp';
import { resolveCurrentUserMemoryIdentity } from '@/src/utils/userMemory';
import { NextResponse } from 'next/server';

/**
 * Starts GitHub App installation/connect flow for the current user.
 */
export async function GET(request: Request) {
    const identity = await resolveCurrentUserMemoryIdentity();
    if (!identity) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isGithubAppConfigured()) {
        return NextResponse.json({ error: 'GitHub App is not configured on this server.' }, { status: 503 });
    }

    const url = new URL(request.url);
    const requestedScope = url.searchParams.get('scope');
    const requestedAgentPermanentId = url.searchParams.get('agentPermanentId');
    const returnTo = normalizeGithubAppReturnToPath(url.searchParams.get('returnTo') || undefined);
    const requestedIsGlobal = requestedScope !== 'agent';
    const requestedAgentId = requestedAgentPermanentId?.trim() || null;
    const isGlobal = requestedIsGlobal || !requestedAgentId;
    const agentPermanentId = isGlobal ? null : requestedAgentId;

    const state = createGithubAppConnectionState({
        userId: identity.userId,
        returnTo,
        isGlobal,
        agentPermanentId,
    });
    const connectUrl = buildGithubAppInstallationConnectUrl(state);

    return NextResponse.redirect(connectUrl);
}
