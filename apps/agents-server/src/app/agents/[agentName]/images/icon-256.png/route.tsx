import { PROMPTBOOK_COLOR } from '@promptbook-local/core';
import { serializeError } from '@promptbook-local/utils';
import { ImageResponse } from 'next/og';
import { assertsError } from '../../../../../../../../src/errors/assertsError';
import { Color } from '../../../../../../../../src/utils/color/Color';
import { keepUnused } from '../../../../../../../../src/utils/organization/keepUnused';
import { getAgentName, getAgentProfile } from '../../_utils';

const size = {
    width: 256,
    height: 256,
};

export async function GET(request: Request, { params }: { params: Promise<{ agentName: string }> }) {
    keepUnused(request /* <- Note: We dont need `request` parameter */);

    try {
        const agentName = await getAgentName(params);
        const agentProfile = await getAgentProfile(agentName);
        const agentColor = Color.from(agentProfile.meta.color || PROMPTBOOK_COLOR);

        return new ImageResponse(
            (
                <div
                    style={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        overflow: 'hidden',
                    }}
                >
                    <div
                        style={{
                            width: '100%',
                            height: '100%',
                            backgroundColor: agentColor.toHex(),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        {/* Note: `next/image` is not working propperly with `next/og` */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={agentProfile.meta.image!} alt="Agent Icon" />
                    </div>
                </div>
            ),
            {
                ...size,
                emoji: 'openmoji',
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
 * TODO: [🦚] DRY
 */
