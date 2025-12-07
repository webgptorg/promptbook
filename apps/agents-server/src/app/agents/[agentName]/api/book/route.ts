import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { resolveInheritedAgentSource } from '@/src/utils/resolveInheritedAgentSource';
import { padBook, validateBook } from '@promptbook-local/core';
import { serializeError } from '@promptbook-local/utils';
import spaceTrim from 'spacetrim';
import { assertsError } from '../../../../../../../../src/errors/assertsError';
import { keepUnused } from '../../../../../../../../src/utils/organization/keepUnused';

export async function GET(request: Request, { params }: { params: Promise<{ agentName: string }> }) {
    keepUnused(request /* <- Note: We dont need `request` parameter */);
    let { agentName } = await params;
    agentName = decodeURIComponent(agentName);

    try {
        const collection = await $provideAgentCollectionForServer();
        const agentSource = await collection.getAgentSource(agentName);
        const effectiveAgentSource = await resolveInheritedAgentSource(agentSource, collection);

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

        await collection.updateAgentSource(agentName, agentSource);
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
