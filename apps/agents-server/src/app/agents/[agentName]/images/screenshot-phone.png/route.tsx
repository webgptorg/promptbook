import { TODO_any } from '@promptbook-local/types';
import { serializeError } from '@promptbook-local/utils';
import { ImageResponse } from 'next/og';
import { assertsError } from '../../../../../../../../src/errors/assertsError';
import { keepUnused } from '../../../../../../../../src/utils/organization/keepUnused';
import { createAgentScreenshotLayout, getAgentImageContext } from '../_shared';

/**
 * Target size for the portrait screenshot preview.
 *
 * @private
 */
const size = {
    width: 1080,
    height: 1920,
};

/**
 * Renders the portrait screenshot preview for the agent.
 *
 * @private @@@
 */
export async function GET(request: Request, { params }: { params: Promise<{ agentName: string }> }) {
    keepUnused(request /* <- Note: We dont need `request` parameter */);

    try {
        const context = await getAgentImageContext(params);
        const layout = createAgentScreenshotLayout(context, 'portrait');

        return new ImageResponse(layout as TODO_any, {
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
