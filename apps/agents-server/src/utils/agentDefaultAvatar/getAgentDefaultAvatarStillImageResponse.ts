import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { $provideAgentReferenceResolver } from '@/src/utils/agentReferenceResolver/$provideAgentReferenceResolver';
import { resolveServerAgentContext } from '@/src/utils/resolveServerAgentContext';
import { NextRequest, NextResponse } from 'next/server';
import { renderAgentDefaultAvatarSvg } from './renderAgentDefaultAvatarSvg';
import { resolveAgentDefaultAvatarParameters } from './resolveAgentDefaultAvatarParameters';

/**
 * Cache policy for the dynamic deterministic avatar route.
 *
 * The URL is stable while the underlying book may change, so clients must revalidate.
 */
const DEFAULT_AVATAR_CACHE_CONTROL = 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800';

/**
 * Builds the shared deterministic still-image response used by both `.png` and `.svg` avatar routes.
 *
 * @param request - Current Next.js request.
 * @param agentNameParam - Route agent-name parameter.
 * @returns SVG still image response for the resolved agent.
 */
export async function getAgentDefaultAvatarStillImageResponse(
    request: NextRequest,
    agentNameParam: string,
): Promise<NextResponse> {
    const agentName = decodeURIComponent(agentNameParam);

    if (!agentName) {
        return NextResponse.json({ error: 'Agent name is required' }, { status: 400 });
    }

    const collection = await $provideAgentCollectionForServer();
    const fallbackResolver = await $provideAgentReferenceResolver();
    const resolvedAgentContext = await resolveServerAgentContext({
        collection,
        agentIdentifier: agentName,
        localServerUrl: new URL(request.url).origin,
        fallbackResolver,
    });
    const customMetaImage = resolvedAgentContext.resolvedAgentProfile.meta.image;

    if (customMetaImage) {
        const requestUrl = new URL(request.url);

        if (!customMetaImage.startsWith('data:') && !customMetaImage.startsWith('blob:')) {
            try {
                const resolvedCustomImageUrl = new URL(customMetaImage, requestUrl.origin);

                if (resolvedCustomImageUrl.pathname !== requestUrl.pathname) {
                    return NextResponse.redirect(resolvedCustomImageUrl);
                }
            } catch (error) {
                console.warn('Invalid custom agent image URL, falling back to deterministic default avatar.', {
                    agentName,
                    customMetaImage,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
    }

    const resolvedParameters = await resolveAgentDefaultAvatarParameters({
        agentProfile: resolvedAgentContext.resolvedAgentProfile,
        resolvedAgentSource: resolvedAgentContext.resolvedAgentSource,
    });
    const etag = `"agent-default-avatar-${resolvedParameters.avatarFingerprint}"`;

    if (request.headers.get('if-none-match') === etag) {
        return new NextResponse(null, {
            status: 304,
            headers: {
                ETag: etag,
                'Cache-Control': DEFAULT_AVATAR_CACHE_CONTROL,
            },
        });
    }

    const svg = renderAgentDefaultAvatarSvg(resolvedParameters.parameters);

    return new NextResponse(svg, {
        status: 200,
        headers: {
            'Content-Type': 'image/svg+xml; charset=utf-8',
            'Cache-Control': DEFAULT_AVATAR_CACHE_CONTROL,
            ETag: etag,
        },
    });
}
