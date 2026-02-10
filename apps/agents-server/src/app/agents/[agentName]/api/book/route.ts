import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { getWellKnownAgentUrl } from '@/src/utils/getWellKnownAgentUrl';
import { resolveInheritedAgentSource } from '@/src/utils/resolveInheritedAgentSource';
import { padBook, validateBook } from '@promptbook-local/core';
import { parseNumber, serializeError } from '@promptbook-local/utils';
import spaceTrim from 'spacetrim';
import { DEFAULT_MAX_RECURSION } from '../../../../../../../../src/config';
import { assertsError } from '../../../../../../../../src/errors/assertsError';
import { $provideAgentReferenceResolver } from '@/src/utils/agentReferenceResolver/$provideAgentReferenceResolver';

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
        const agentId = await collection.getAgentPermanentId(agentName);
        const agentSource = await collection.getAgentSource(agentId);
        const agentReferenceResolver = await $provideAgentReferenceResolver();
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
        let agentSourceUnchecked = await request.text();
        agentSourceUnchecked = spaceTrim(agentSourceUnchecked);
        let agentSource = validateBook(agentSourceUnchecked);
        agentSource = padBook(agentSource);

        const agentId = await collection.getAgentPermanentId(agentName);
        await collection.updateAgentSource(agentId, agentSource);
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
