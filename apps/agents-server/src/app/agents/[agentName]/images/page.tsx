'use server';

import { saturate } from '@promptbook-local/color';
import { PROMPTBOOK_COLOR } from '@promptbook-local/core';
import Link from 'next/link';
import { Color } from '../../../../../../../src/utils/color/Color';
import { getAgentName, getAgentProfile } from '../_utils';

/**
 * Available image types for agents with their descriptions and sizes
 */
const AGENT_IMAGES = [
    {
        name: 'default-avatar.png',
        title: 'Default Avatar',
        description: 'AI-generated avatar image based on the agent profile. Vertical orientation (1024x1792).',
        size: '1024×1792',
    },
    {
        name: 'icon-256.png',
        title: 'Icon (256×256)',
        description: 'Small circular icon suitable for profile pictures and thumbnails.',
        size: '256×256',
    },
    {
        name: 'screenshot-fullhd.png',
        title: 'Screenshot Full HD',
        description: 'Landscape screenshot showing the agent with name. Suitable for desktop previews.',
        size: '1920×1080',
    },
    {
        name: 'screenshot-phone.png',
        title: 'Screenshot Phone',
        description: 'Portrait screenshot optimized for mobile devices.',
        size: '1080×1920',
    },
] as const;

export default async function AgentImagesPage({ params }: { params: Promise<{ agentName: string }> }) {
    const agentName = await getAgentName(params);
    const agentProfile = await getAgentProfile(agentName);

    const brandColor = Color.fromSafe(agentProfile.meta.color || PROMPTBOOK_COLOR);
    const brandColorHex = brandColor.then(saturate(-0.5)).toHex();

    const fullname = (agentProfile.meta.fullname || agentProfile.agentName || 'Agent') as string;

    return (
        <div
            style={{
                minHeight: '100vh',
                backgroundColor: '#f5f5f5',
                padding: '2rem',
            }}
        >
            <div
                style={{
                    maxWidth: '1200px',
                    margin: '0 auto',
                }}
            >
                <header
                    style={{
                        marginBottom: '2rem',
                        padding: '1.5rem',
                        backgroundColor: brandColorHex,
                        borderRadius: '12px',
                        color: 'white',
                    }}
                >
                    <h1 style={{ margin: 0, fontSize: '2rem' }}>
                        Images for <strong>{fullname}</strong>
                    </h1>
                    <p style={{ margin: '0.5rem 0 0', opacity: 0.9 }}>
                        All available image assets for agent{' '}
                        <code
                            style={{
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                            }}
                        >
                            {agentName}
                        </code>
                    </p>
                </header>

                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: '1.5rem',
                    }}
                >
                    {AGENT_IMAGES.map((image) => {
                        const imageUrl = `/agents/${encodeURIComponent(agentName)}/images/${image.name}`;
                        return (
                            <div
                                key={image.name}
                                style={{
                                    backgroundColor: 'white',
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                }}
                            >
                                <div
                                    style={{
                                        aspectRatio: '16/9',
                                        backgroundColor: '#e0e0e0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        overflow: 'hidden',
                                    }}
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={imageUrl}
                                        alt={image.title}
                                        style={{
                                            maxWidth: '100%',
                                            maxHeight: '100%',
                                            objectFit: 'contain',
                                        }}
                                    />
                                </div>
                                <div style={{ padding: '1rem' }}>
                                    <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem' }}>{image.title}</h2>
                                    <p style={{ margin: '0 0 0.5rem', color: '#666', fontSize: '0.9rem' }}>
                                        {image.description}
                                    </p>
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginTop: '1rem',
                                        }}
                                    >
                                        <span
                                            style={{
                                                backgroundColor: '#f0f0f0',
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                fontSize: '0.85rem',
                                                color: '#555',
                                            }}
                                        >
                                            {image.size}
                                        </span>
                                        <Link
                                            href={imageUrl}
                                            target="_blank"
                                            style={{
                                                backgroundColor: brandColorHex,
                                                color: 'white',
                                                padding: '8px 16px',
                                                borderRadius: '6px',
                                                textDecoration: 'none',
                                                fontSize: '0.9rem',
                                            }}
                                        >
                                            Open Image
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <footer
                    style={{
                        marginTop: '2rem',
                        padding: '1rem',
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        textAlign: 'center',
                        color: '#666',
                    }}
                >
                    <p style={{ margin: 0 }}>
                        <Link
                            href={`/agents/${encodeURIComponent(agentName)}`}
                            style={{ color: brandColorHex, textDecoration: 'none' }}
                        >
                            ← Back to {fullname}
                        </Link>
                    </p>
                </footer>
            </div>
        </div>
    );
}

/**
 * TODO: [🦚] Add download button functionality
 * TODO: [🦚] Add image regeneration option for default-avatar
 */
