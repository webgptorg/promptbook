import { serializeError } from '@promptbook-local/utils';
import { ImageResponse } from 'next/og';
import { assertsError } from '../../../../../../../../src/errors/assertsError';
import { keepUnused } from '../../../../../../../../src/utils/organization/keepUnused';
import { createAgentIconLayout, getAgentImageContext } from '../_shared';
import { TODO_any } from '@promptbook-local/types';

/**
 * Target size for the generated icon.
 *
 * @private
 */
const size = {
    width: 256,
    height: 256,
};

/**
 * Renders the circular agent icon used across the agents server.
 *
 * @private @@@
 */
export async function GET(request: Request, { params }: { params: Promise<{ agentName: string }> }) {
    keepUnused(request /* <- Note: We dont need `request` parameter */);

    try {
        const context = await getAgentImageContext(params);

        return new ImageResponse(createAgentIconLayout(context) as TODO_any, {
            ...size,
            emoji: 'openmoji',
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
