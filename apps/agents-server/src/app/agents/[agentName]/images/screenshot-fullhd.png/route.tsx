import { serializeError } from '@promptbook-local/utils';
import { ImageResponse } from 'next/og';
import { assertsError } from '../../../../../../../../src/errors/assertsError';
import { keepUnused } from '../../../../../../../../src/utils/organization/keepUnused';
import { TODO_any } from '../../../../../../../../src/utils/organization/TODO_any';
import { createAgentScreenshotLayout, getAgentImageContext } from '../_shared';

/**
 * Target size for the landscape screenshot preview.
 *
 * @private
 */
const size = {
    width: 1920,
    height: 1080,
};

/**
 * Renders the landscape screenshot preview for the agent.
 *
 * @private @@@
 */
export async function GET(request: Request, { params }: { params: Promise<{ agentName: string }> }) {
    keepUnused(request /* <- Note: We dont need `request` parameter */);

    try {
        const context = await getAgentImageContext(params);
        const layout = createAgentScreenshotLayout(context, 'landscape');

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
