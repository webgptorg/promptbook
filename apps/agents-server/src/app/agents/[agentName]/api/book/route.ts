import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { $provideAgentReferenceResolver } from '@/src/utils/agentReferenceResolver/$provideAgentReferenceResolver';
import {
    parseBookScopedAgentIdentifier,
    resolveBookScopedAgentContext,
} from '@/src/utils/agentReferenceResolver/bookScopedAgentReferences';
import { loadFederatedAgentImportConfiguration } from '@/src/utils/federatedAgentImportConfiguration';
import { getCurrentUser } from '@/src/utils/getCurrentUser';
import { getWellKnownAgentUrl } from '@/src/utils/getWellKnownAgentUrl';
import { resolveInheritedAgentSource } from '@/src/utils/resolveInheritedAgentSource';
import { padBook, validateBook } from '@promptbook-local/core';
import type { string_agent_url } from '@promptbook-local/types';
import { computeHash, parseNumber, serializeError } from '@promptbook-local/utils';
import { spaceTrim } from 'spacetrim';
import { DEFAULT_MAX_RECURSION } from '../../../../../../../../src/config';
import { assertsError } from '../../../../../../../../src/errors/assertsError';

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
 * Checks whether the client already has the latest ETag variant.
 *
 * @param request - Incoming HTTP request.
 * @param etag - Freshly computed ETag for the response body.
 * @returns `true` when the request can be answered with `304 Not Modified`.
 */
function hasMatchingEtag(request: Request, etag: string): boolean {
    const ifNoneMatch = request.headers.get('if-none-match');
    if (!ifNoneMatch) {
        return false;
    }

    return ifNoneMatch
        .split(',')
        .map((candidate) => candidate.trim())
        .some((candidate) => candidate === '*' || candidate === etag);
}

/**
 * Note: [🕺] This route gives the agent source *(with resolved inheritance)*
 *
 * @@@
 */
export async function GET(request: Request, { params }: { params: Promise<{ agentName: string }> }) {
    try {
        if (!(await getCurrentUser())) {
            return new Response(JSON.stringify({ error: 'Forbidden' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        let { agentName } = await params;
        agentName = decodeURIComponent(agentName);

        const url = new URL(request.url);
        const recursionLevel = parseNumber(url.searchParams.get('recursionLevel'));
        const inheritancePath = url.searchParams.getAll('resolutionPath');

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
        const agentSource = resolvedAgentContext.unresolvedAgentSource;
        const agentReferenceResolver = resolvedAgentContext.scopedAgentReferenceResolver;
        const federatedAgentImportConfiguration = await loadFederatedAgentImportConfiguration();
        const effectiveAgentSource = await resolveInheritedAgentSource(agentSource, {
            adamAgentUrl: await getWellKnownAgentUrl('ADAM'),
            recursionLevel,
            currentAgentUrl: resolvedAgentContext.canonicalAgentUrl,
            inheritancePath: inheritancePath as Array<string_agent_url>,
            agentReferenceResolver,
            federatedAgentImportConfiguration,
        });
        const etag = `W/"${computeHash(effectiveAgentSource)}"`;

        if (hasMatchingEtag(request, etag)) {
            return new Response(null, {
                status: 304,
                headers: {
                    ETag: etag,
                    'Cache-Control': 'no-cache, max-age=0',
                },
            });
        }

        return new Response(effectiveAgentSource, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain' /* <- TODO: [🎳] Mime type of book */,
                ETag: etag,
                'Cache-Control': 'no-cache, max-age=0',
            },
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

/**
 * Handles put.
 */
export async function PUT(request: Request, { params }: { params: Promise<{ agentName: string }> }) {
    let { agentName } = await params;
    agentName = decodeURIComponent(agentName);

    try {
        if (!(await getCurrentUser())) {
            return new Response(JSON.stringify({ error: 'Forbidden' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' },
            });
        }

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
