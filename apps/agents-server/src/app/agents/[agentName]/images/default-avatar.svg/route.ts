import { NextRequest } from 'next/server';
import { assertsError } from '../../../../../../../../src/errors/assertsError';
import { serializeError } from '@promptbook-local/utils';
import { getAgentDefaultAvatarStillImageResponse } from '../../../../../utils/agentDefaultAvatar/getAgentDefaultAvatarStillImageResponse';

/**
 * Serves the deterministic procedural default avatar as dynamic SVG.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ agentName: string }> }) {
    try {
        const { agentName } = await params;
        return await getAgentDefaultAvatarStillImageResponse(request, agentName);
    } catch (error) {
        assertsError(error);

        console.error('Error serving default avatar SVG:', error);

        return new Response(JSON.stringify(serializeError(error), null, 4), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
