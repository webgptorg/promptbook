import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { getWellKnownAgentUrl } from '@/src/utils/getWellKnownAgentUrl';
import { resolveInheritedAgentSource } from '@/src/utils/resolveInheritedAgentSource';
import { padBook, validateBook } from '@promptbook-local/core';
import { parseNumber, serializeError } from '@promptbook-local/utils';
import spaceTrim from 'spacetrim';
import { DEFAULT_MAX_RECURSION } from '../../../../../../../../src/config';
import { assertsError } from '../../../../../../../../src/errors/assertsError';
import { $provideAgentReferenceResolver } from '@/src/utils/agentReferenceResolver/$provideAgentReferenceResolver';
import {
    parseBookScopedAgentIdentifier,
    resolveBookScopedAgentContext,
} from '@/src/utils/agentReferenceResolver/bookScopedAgentReferences';

/**
 * Normalizes optional history version name received from request.
 *
 * @param versionName - Raw query parameter value.
 * @returns Trimmed non-empty version name, otherwise `null`.
 */
function normalizeHistoryVersionName(versionName: string | null): string | null {
    if (typeof versionName !== 'string') {
        return null;
    }

    const normalizedVersionName = versionName.trim();
    return normalizedVersionName.length > 0 ? normalizedVersionName : null;
}

/**
 * @@@
 *
 * Note: [🕺] This route gives the agent source *(with resolved inheritance)*
 */
export async function GET(request: Request, { params }: { params: Promise<{ agentName: string }> }) {
    try {
        let { agentName } = await params;
        agentName = decodeURIComponent(agentName);

        const url = new URL(request.url);
        const recursionLevel = parseNumber(url.searchParams.get('recursionLevel'));

        console.info(`[🕺] GET /agents/${agentName}/api/book?recursionLevel=${recursionLevel}`);

        if (recursionLevel > DEFAULT_MAX_RECURSION) {
            throw new Error(
                spaceTrim(`
                
                    Recursion depth ${recursionLevel} exceeds maximum allowed ${DEFAULT_MAX_RECURSION}

                    This is to prevent infinite loops when resolving inherited agent sources.
                
                `),
            );
        }

        const collection = await $provideAgentCollectionForServer();
        const baseAgentReferenceResolver = await $provideAgentReferenceResolver();
        const resolvedAgentContext = await resolveBookScopedAgentContext({
            collection,
            agentIdentifier: agentName,
            localServerUrl: new URL(request.url).origin,
            fallbackResolver: baseAgentReferenceResolver,
        });
        const agentSource = resolvedAgentContext.resolvedAgentSource;
        const agentReferenceResolver = resolvedAgentContext.scopedAgentReferenceResolver;
        const effectiveAgentSource = await resolveInheritedAgentSource(agentSource, {
            adamAgentUrl: await getWellKnownAgentUrl('ADAM'),
            recursionLevel,
            agentReferenceResolver,
        });

        return new Response(effectiveAgentSource, {
            status: 200,
            headers: { 'Content-Type': 'text/plain' /* <- TODO: [🎳] Mime type of book */ },
        });
    } catch (error) {
        assertsError(error);

        console.error(error);

        return new Response(
            JSON.stringify(
                serializeError(error),
                // <- TODO: [🐱‍🚀] Rename `serializeError` to `errorToJson`
                null,
                4,
                // <- TODO: [🐱‍🚀] Allow to configure pretty print for agent server
            ),
            {
                status: 400, // <- TODO: [🐱‍🚀] Make `errorToHttpStatusCode`
                headers: { 'Content-Type': 'application/json' },
            },
        );
    }
}

export async function PUT(request: Request, { params }: { params: Promise<{ agentName: string }> }) {
    let { agentName } = await params;
    agentName = decodeURIComponent(agentName);

    try {
        const collection = await $provideAgentCollectionForServer();
        if (parseBookScopedAgentIdentifier(agentName)) {
            throw new Error('Embedded in-book agents cannot be updated directly. Edit the parent agent book instead.');
        }
        const requestUrl = new URL(request.url);
        const versionName = normalizeHistoryVersionName(requestUrl.searchParams.get('versionName'));
        let agentSourceUnchecked = await request.text();
        agentSourceUnchecked = spaceTrim(agentSourceUnchecked);
        let agentSource = validateBook(agentSourceUnchecked);
        agentSource = padBook(agentSource);

        const agentId = await collection.getAgentPermanentId(agentName);
        await collection.updateAgentSource(agentId, agentSource, { versionName });
        // <- TODO: [🐱‍🚀] Properly type as string_book

        return new Response(
            JSON.stringify({
                isSuccessful: true,
                message: `Agent "${agentName}" updated successfully`,
                agentSource, // <- TODO: [🐱‍🚀] Remove from response
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            },
        );
    } catch (error) {
        assertsError(error);

        console.error(error);

        return new Response(
            JSON.stringify(
                serializeError(error),
                // <- TODO: [🐱‍🚀] Rename `serializeError` to `errorToJson`
                null,
                4,
                // <- TODO: [🐱‍🚀] Allow to configure pretty print for agent server
            ),
            {
                status: 400, // <- TODO: [🐱‍🚀] Make `errorToHttpStatusCode`
                headers: { 'Content-Type': 'application/json' },
            },
        );
    }
}
