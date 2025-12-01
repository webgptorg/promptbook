// TODO: !!!! Make it work

import { PROMPTBOOK_COLOR } from '@promptbook-local/core';
import { ImageResponse } from 'next/og';
import { Color } from '../../../../../../src/utils/color/Color';
import { withAlpha } from '../../../../../../src/utils/color/operators/withAlpha';
import { AGENT_ACTIONS, getAgentName, getAgentProfile } from './_utils';

// export const runtime = 'edge';
// <- Note: On Vercel Edge runtime some modules are not working *(like `crypto`)*

export const alt = 'Agent Profile';
export const size = {
    width: 1200,
    height: 630,
};

export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ agentName: string }> }) {
    try {
        const agentName = await getAgentName(params);
        const agentProfile = await getAgentProfile(agentName);
        // const { publicUrl } = await $provideServer();

        // Extract brand color from meta
        const brandColor = Color.from(agentProfile.meta.color || PROMPTBOOK_COLOR);
        const bgColor = brandColor.then(withAlpha(0.05)).toHex();
        const borderColor = brandColor.then(withAlpha(0.1)).toHex();
        const badgeColor = brandColor.toHex();

        const agentActions = AGENT_ACTIONS;

        return new ImageResponse(
            (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'white',
                    }}
                >
                    {/* Left sidebar: Profile info */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            width: '400px', // Fixed width like in the page
                            height: '100%',
                            padding: '24px',
                            backgroundColor: bgColor,
                            borderRight: `1px solid ${borderColor}`,
                            gap: '24px',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            {agentProfile.meta.image && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={agentProfile.meta.image as string}
                                    alt={agentProfile.meta.fullname || agentProfile.agentName || 'Agent'}
                                    width="64"
                                    height="64"
                                    style={{
                                        borderRadius: '50%',
                                        objectFit: 'cover',
                                        border: `2px solid ${badgeColor}`,
                                        width: '64px',
                                        height: '64px',
                                    }}
                                />
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                <h1
                                    style={{
                                        fontSize: '30px',
                                        fontWeight: 'bold',
                                        color: '#111827', // text-gray-900
                                        margin: 0,
                                        wordBreak: 'break-word',
                                    }}
                                >
                                    {agentProfile.meta.fullname || agentProfile.agentName}
                                </h1>
                                <div
                                    style={{
                                        display: 'flex',
                                        marginTop: '4px',
                                    }}
                                >
                                    <span
                                        style={{
                                            backgroundColor: badgeColor,
                                            color: 'white',
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                        }}
                                    >
                                        Agent
                                    </span>
                                </div>
                            </div>
                        </div>

                        <p style={{ color: '#374151', fontSize: '16px', lineHeight: '1.5' }}>
                            {agentProfile.personaDescription}
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <h2
                                style={{
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    color: '#374151',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                }}
                            >
                                Capabilities
                            </h2>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {agentActions.map((action) => (
                                    <span
                                        key={action}
                                        style={{
                                            padding: '4px 12px',
                                            backgroundColor: 'white',
                                            color: '#374151',
                                            borderRadius: '9999px',
                                            fontSize: '12px',
                                            fontWeight: 500,
                                            border: '1px solid #e5e7eb',
                                        }}
                                    >
                                        {action}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* QR Code Placeholder / Visual */}
                            <div
                                style={{
                                    display: 'flex',
                                    backgroundColor: 'white',
                                    padding: '16px',
                                    borderRadius: '8px',
                                    border: '1px solid #f3f4f6',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                            >
                                <div style={{ color: '#9ca3af', fontSize: '14px' }}>
                                    {/* Just a visual representation since generating actual QR might be complex/heavy for OG */}
                                    Scan to Chat
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main content area representation */}
                    <div
                        style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            backgroundColor: 'white',
                            position: 'relative',
                        }}
                    >
                        {/* Mock Header */}
                        <div
                            style={{
                                height: '60px',
                                borderBottom: '1px solid #e5e7eb',
                                display: 'flex',
                                alignItems: 'center',
                                paddingLeft: '24px',
                            }}
                        >
                            <span style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>
                                Chat with {agentProfile.meta.fullname || agentProfile.agentName}
                            </span>
                        </div>

                        {/* Mock Chat bubbles */}
                        <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <div
                                    style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        backgroundColor: badgeColor,
                                        opacity: 0.1,
                                    }}
                                ></div>
                                <div
                                    style={{
                                        backgroundColor: '#f3f4f6',
                                        padding: '16px',
                                        borderRadius: '0 16px 16px 16px',
                                        maxWidth: '80%',
                                    }}
                                >
                                    <p style={{ margin: 0, color: '#374151' }}>
                                        Hello! I am {agentProfile.meta.fullname || agentProfile.agentName}. How can I
                                        help you today?
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', flexDirection: 'row-reverse' }}>
                                <div
                                    style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        backgroundColor: '#e5e7eb',
                                    }}
                                ></div>
                                <div
                                    style={{
                                        backgroundColor: badgeColor,
                                        padding: '16px',
                                        borderRadius: '16px 0 16px 16px',
                                        maxWidth: '80%',
                                    }}
                                >
                                    <p style={{ margin: 0, color: 'white' }}>...</p>
                                </div>
                            </div>
                        </div>

                        {/* Input area mock */}
                        <div
                            style={{
                                position: 'absolute',
                                bottom: '0',
                                left: '0',
                                right: '0',
                                padding: '24px',
                                borderTop: '1px solid #e5e7eb',
                            }}
                        >
                            <div
                                style={{
                                    height: '50px',
                                    borderRadius: '8px',
                                    border: '1px solid #e5e7eb',
                                    backgroundColor: '#f9fafb',
                                }}
                            ></div>
                        </div>
                    </div>
                </div>
            ),
            {
                ...size,
                emoji: 'openmoji',
            },
        );
    } catch (error) {
        console.error(error);
        return new Response(`Failed to generate the Agent Open Graph image`, {
            status: 500,
        });
    }
}
