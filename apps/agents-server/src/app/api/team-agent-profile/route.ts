import { NextResponse } from 'next/server';

import { resolvePlaceholderImageUrl, resolveProfileImageUrl } from '../../../../../../src/book-components/Chat/utils/loadAgentProfile';
import { isValidAgentUrl } from '@/src/utils/validators/url/isValidAgentUrl';

/**
 * Builds the profile endpoint for a teammate agent URL.
 *
 * @param agentUrl - Base agent URL.
 * @returns Absolute URL pointing to the agent profile.
 */
function buildAgentProfileEndpoint(agentUrl: string): string {
    const parsed = new URL(agentUrl);
    const normalizedPath = parsed.pathname.replace(/\/$/, '');
    parsed.pathname = `${normalizedPath}/api/profile`;
    parsed.search = '';
    return parsed.toString();
}

/**
 * Fetches a teammate agent profile server-side so the browser can render human-friendly metadata.
 *
 * @param agentUrl - Remote teammate agent URL.
 * @returns Profile metadata or `null` when fetching fails.
 */
async function fetchAgentProfile(agentUrl: string): Promise<TeamAgentProfileResponse | null> {
    try {
        const profileUrl = buildAgentProfileEndpoint(agentUrl);
        const response = await fetch(profileUrl, {
            method: 'GET',
            headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
            return null;
        }

        const payload = (await response.json()) as {
            agentName?: string;
            meta?: { fullname?: string; image?: string };
        };

        const label = (payload.meta?.fullname || payload.agentName || '').trim() || undefined;
        const resolvedImageUrl =
            resolveProfileImageUrl(payload.meta?.image, agentUrl, agentUrl) ||
            resolvePlaceholderImageUrl({
                url: agentUrl,
                publicUrl: agentUrl,
            });

        return {
            url: agentUrl,
            label,
            imageUrl: resolvedImageUrl || undefined,
        };
    } catch (error) {
        console.warn('[team-agent-profile] Failed to fetch profile for', agentUrl, error);
        return null;
    }
}

/**
 * Proxy endpoint that returns friendly metadata for teammate agents referenced via TEAM tools.
 *
 * The client uses this to render tool call chips without relying on direct cross-origin requests
 * to the teammate agent.
 */
export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const agentUrl = requestUrl.searchParams.get('url');

    if (!agentUrl || !isValidAgentUrl(agentUrl)) {
        return NextResponse.json({ error: 'Invalid agent URL' }, { status: 400 });
    }

    const normalizedUrl = agentUrl.replace(/\/$/, '');
    const profile = await fetchAgentProfile(normalizedUrl);

    if (!profile) {
        return NextResponse.json(
            { url: normalizedUrl, error: 'Failed to load teammate profile' },
            { status: 502 },
        );
    }

    return NextResponse.json(profile, {
        status: 200,
        headers: {
            'Cache-Control': 'private, max-age=3600',
        },
    });
}
