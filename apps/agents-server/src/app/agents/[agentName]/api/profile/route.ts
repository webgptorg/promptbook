import { getMetadata } from '@/src/database/getMetadata';
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { computeAgentHash, parseAgentSource } from '@promptbook-local/core';
import { serializeError } from '@promptbook-local/utils';
import { assertsError } from '../../../../../../../../src/errors/assertsError';
import { keepUnused } from '../../../../../../../../src/utils/organization/keepUnused';

export async function OPTIONS(request: Request) {
    keepUnused(request);
    return new Response(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}

export async function GET(request: Request, { params }: { params: Promise<{ agentName: string }> }) {
    keepUnused(request /* <- Note: We dont need `request` parameter */);
    let { agentName } = await params;
    agentName = decodeURIComponent(agentName);

    try {
        const collection = await $provideAgentCollectionForServer();
        const agentSource = await collection.getAgentSource(agentName);
        const agentProfile = parseAgentSource(agentSource);
        const agentHash = computeAgentHash(agentSource);
        const isVoiceCallingEnabled = (await getMetadata('IS_EXPERIMENTAL_VOICE_CALLING_ENABLED')) === 'true';

        if (!agentProfile.meta.image) {
            agentProfile.meta.image = `/agents/${encodeURIComponent(agentName)}/images/default-avatar.png`;
        }

        return new Response(
            JSON.stringify(
                {
                    ...agentProfile,
                    agentHash,
                    parameters: [], // <- TODO: [😰] Implement parameters
                    isVoiceCallingEnabled, // [✨✷] Add voice calling status
                },
                // <- TODO: [🐱‍🚀] Rename `serializeError` to `errorToJson`
                null,
                4,
                // <- TODO: [🐱‍🚀] Allow to configure pretty print for agent server
            ),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*', // <- Note: Allow embedding on other websites
                },
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

/**
 * TODO: [🍞] DRY - Make some common utility for API on one agent
 */
