import {
    connectGithubAppInstallationForUser,
    isGithubAppConfigured,
    normalizeGithubAppReturnToPath,
    parseGithubAppConnectionState,
} from '@/src/utils/githubApp';
import { resolveCurrentUserMemoryIdentity } from '@/src/utils/userMemory';
import { storeUseProjectGithubAppTokenInWallet } from '@/src/utils/userWallet';
import { NextResponse } from 'next/server';

/**
 * Handles GitHub App installation callback and stores generated token in wallet.
 */
export async function GET(request: Request) {
    if (!isGithubAppConfigured()) {
        return NextResponse.json({ error: 'GitHub App is not configured on this server.' }, { status: 503 });
    }

    const requestUrl = new URL(request.url);
    const state = requestUrl.searchParams.get('state') || '';
    const defaultReturnTo = normalizeGithubAppReturnToPath(undefined);

    if (!state) {
        return redirectWithGithubAppStatus({
            requestUrl,
            returnTo: defaultReturnTo,
            status: 'error',
            error: 'missing_state',
        });
    }

    try {
        const parsedState = parseGithubAppConnectionState({ state });
        const returnTo = parsedState.returnTo;
        const identity = await resolveCurrentUserMemoryIdentity();
        if (!identity || identity.userId !== parsedState.userId) {
            return redirectWithGithubAppStatus({
                requestUrl,
                returnTo,
                status: 'error',
                error: 'unauthorized_user',
            });
        }

        const installationId = parsePositiveInteger(requestUrl.searchParams.get('installation_id'));
        if (!installationId) {
            return redirectWithGithubAppStatus({
                requestUrl,
                returnTo,
                status: 'error',
                error: 'missing_installation_id',
            });
        }

        const accessToken = await connectGithubAppInstallationForUser({
            userId: identity.userId,
            installationId,
        });

        await storeUseProjectGithubAppTokenInWallet({
            userId: identity.userId,
            token: accessToken.token,
            isGlobal: parsedState.isGlobal,
            agentPermanentId: parsedState.isGlobal ? null : parsedState.agentPermanentId,
        });

        return redirectWithGithubAppStatus({
            requestUrl,
            returnTo,
            status: 'connected',
        });
    } catch (error) {
        return redirectWithGithubAppStatus({
            requestUrl,
            returnTo: defaultReturnTo,
            status: 'error',
            error: sanitizeGithubAppError(error),
        });
    }
}

/**
 * Redirects to return path with compact GitHub App status query parameters.
 */
function redirectWithGithubAppStatus(options: {
    requestUrl: URL;
    returnTo: string;
    status: 'connected' | 'error';
    error?: string;
}): NextResponse {
    const redirectUrl = new URL(options.returnTo, options.requestUrl.origin);
    redirectUrl.searchParams.set('githubAppStatus', options.status);
    if (options.error) {
        redirectUrl.searchParams.set('githubAppError', options.error);
    } else {
        redirectUrl.searchParams.delete('githubAppError');
    }

    return NextResponse.redirect(redirectUrl);
}

/**
 * Parses a positive integer from optional query parameter.
 */
function parsePositiveInteger(rawValue: string | null): number | null {
    const parsedValue = Number.parseInt(rawValue || '', 10);
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
        return null;
    }

    return parsedValue;
}

/**
 * Normalizes unknown callback errors to a short, query-safe identifier.
 */
function sanitizeGithubAppError(error: unknown): string {
    const message = error instanceof Error ? error.message : 'github_app_callback_failed';
    return message
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 80);
}
