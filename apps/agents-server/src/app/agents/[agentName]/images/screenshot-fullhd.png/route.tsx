// TODO: !!!! Make it work

import { PROMPTBOOK_COLOR } from '@promptbook-local/core';
import { serializeError } from '@promptbook-local/utils';
import { ImageResponse } from 'next/og';
import { assertsError } from '../../../../../../../../src/errors/assertsError';
import { Color } from '../../../../../../../../src/utils/color/Color';
import { textColor } from '../../../../../../../../src/utils/color/operators/furthest';
import { grayscale } from '../../../../../../../../src/utils/color/operators/grayscale';
import { keepUnused } from '../../../../../../../../src/utils/organization/keepUnused';
import { getAgentName, getAgentProfile } from '../../_utils';

const size = {
    width: 1920,
    height: 1080,
};

export async function GET(request: Request, { params }: { params: Promise<{ agentName: string }> }) {
    keepUnused(request /* <- Note: We dont need `request` parameter */);

    try {
        const agentName = await getAgentName(params);
        const agentProfile = await getAgentProfile(agentName);
        const agentColor = Color.from(agentProfile.meta.color || PROMPTBOOK_COLOR);
        const backgroundColor = agentColor.then(grayscale(0.5));

        return new ImageResponse(
            (
                <div
                    style={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: backgroundColor.toHex(),
                        color: agentColor.then(textColor).toHex(),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <div
                        style={{
                            width: '40%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        {/* Note: `next/image` is not working propperly with `next/og` */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            style={{
                                width: '80%',
                                backgroundColor: agentColor.toHex(),
                                borderRadius: '50%',
                            }}
                            src={agentProfile.meta.image!}
                            alt="Agent Icon"
                        />
                    </div>
                    <div style={{ width: '60%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <h1 style={{ fontSize: '110px' }}>{agentProfile.meta.fullname || agentName}</h1>
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
 * TODO: [🦚] This should be the true screenshot NOT just image + Agent name
 */
