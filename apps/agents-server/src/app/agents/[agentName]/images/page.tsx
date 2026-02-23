'use server';

import { saturate } from '@promptbook-local/color';
import { PROMPTBOOK_COLOR } from '@promptbook-local/core';
import Link from 'next/link';
import { Color } from '../../../../../../../src/utils/color/Color';
import { formatAgentNamingText } from '@/src/utils/agentNaming';
import { getAgentNaming } from '@/src/utils/getAgentNaming';
import { getAgentName, getAgentProfile } from '../_utils';

/**
 * Available image assets that Agents Server exposes per agent.
 *
 * @private
 */
const AGENT_IMAGES = [
    {
        name: 'default-avatar.png',
        title: 'Default Avatar',
        description: 'AI-generated portrait inspired by the agent persona. Vertical orientation (1024×1792).',
        size: '1024×1792',
    },
    {
        name: 'icon-256.png',
        title: 'Icon (256×256)',
        description: 'Circular identifier that pairs well with avatars and small badges.',
        size: '256×256',
    },
    {
        name: 'screenshot-fullhd.png',
        title: 'Screenshot Full HD',
        description: 'Widescreen preview that showcases the agent name and icon for desktop-sized embeds.',
        size: '1920×1080',
    },
    {
        name: 'screenshot-phone.png',
        title: 'Screenshot Phone',
        description: 'Tall preview optimized for mobile previews and Story-style embeds.',
        size: '1080×1920',
    },
] as const;

/**
 * Renders the enhanced agent image gallery page in the Agents Server.
 *
 * @private @@@
 */
export default async function AgentImagesPage({ params }: { params: Promise<{ agentName: string }> }) {
    const agentName = await getAgentName(params);
    const agentProfile = await getAgentProfile(agentName);
    const agentNaming = await getAgentNaming();

    const brandColor = Color.fromSafe(agentProfile.meta.color || PROMPTBOOK_COLOR);
    const brandColorHex = brandColor.then(saturate(-0.5)).toHex();
    const accentColorHex = brandColor.then(saturate(0.4)).toHex();

    const fallbackName = formatAgentNamingText('Agent', agentNaming);
    const fullname = (agentProfile.meta.fullname || agentProfile.agentName || fallbackName) as string;

    return (
        <div
            style={{
                minHeight: '100vh',
                padding: '3rem 1rem 4rem',
                background:
                    'radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 50%), #030510',
            }}
        >
            <div
                style={{
                    maxWidth: '1200px',
                    margin: '0 auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.5rem',
                }}
            >
                <header
                    style={{
                        borderRadius: '28px',
                        padding: '2.5rem',
                        background: `linear-gradient(135deg, ${brandColorHex} 0%, #0d1321 70%)`,
                        color: 'white',
                        boxShadow: '0 30px 70px rgba(0,0,0,0.55)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1.2rem',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '1rem',
                        }}
                    >
                        <div style={{ flex: '1 1 280px' }}>
                            <p
                                style={{
                                    margin: 0,
                                    fontSize: '0.85rem',
                                    letterSpacing: '0.25em',
                                    textTransform: 'uppercase',
                                    color: 'rgba(255,255,255,0.85)',
                                }}
                            >
                                {formatAgentNamingText('Generated images', agentNaming)}
                            </p>
                            <h1 style={{ margin: '0.35rem 0 0', fontSize: '2.45rem' }}>
                                Assets for <strong>{fullname}</strong>
                            </h1>
                        </div>
                    </div>
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '1rem' }}>
                        {formatAgentNamingText(
                            'Every image tile is generated from the agent profile so you can reuse consistent visuals anywhere.',
                            agentNaming,
                        )}{' '}
                        <code
                            style={{
                                backgroundColor: 'rgba(255,255,255,0.15)',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                            }}
                        >
                            {agentName}
                        </code>
                    </p>
                </header>

                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                        gap: '1.25rem',
                    }}
                >
                    {AGENT_IMAGES.map((image) => {
                        const imageUrl = `/agents/${encodeURIComponent(agentName)}/images/${image.name}`;

                        return (
                            <article
                                key={image.name}
                                style={{
                                    backgroundColor: 'rgba(255,255,255,0.02)',
                                    borderRadius: '22px',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    boxShadow: '0 20px 40px rgba(0,0,0,0.35)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    overflow: 'hidden',
                                }}
                            >
                                <div
                                    style={{
                                        position: 'relative',
                                        paddingTop: '55%',
                                        background:
                                            'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(0,0,0,0.6))',
                                        overflow: 'hidden',
                                    }}
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={imageUrl}
                                        alt={`${fullname} ${image.title}`}
                                        style={{
                                            position: 'absolute',
                                            inset: 0,
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                            filter: 'saturate(1.1) contrast(1.05)',
                                        }}
                                    />
                                    <span
                                        style={{
                                            position: 'absolute',
                                            top: '12px',
                                            left: '12px',
                                            padding: '4px 10px',
                                            borderRadius: '999px',
                                            backgroundColor: 'rgba(0,0,0,0.35)',
                                            color: '#fff',
                                            fontSize: '0.7rem',
                                            letterSpacing: '0.15em',
                                        }}
                                    >
                                        {image.size}
                                    </span>
                                </div>
                                <div
                                    style={{
                                        padding: '1.3rem 1.4rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.6rem',
                                        flex: 1,
                                    }}
                                >
                                    <h2 style={{ margin: 0, fontSize: '1.35rem', color: '#fff' }}>{image.title}</h2>
                                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)', fontSize: '0.95rem' }}>
                                        {formatAgentNamingText(image.description, agentNaming)}
                                    </p>
                                    <div
                                        style={{
                                            marginTop: 'auto',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                        }}
                                    >
                                        <span
                                            style={{
                                                color: 'rgba(255,255,255,0.7)',
                                                fontSize: '0.78rem',
                                                letterSpacing: '0.15em',
                                            }}
                                        >
                                            {image.size}
                                        </span>
                                        <Link
                                            href={imageUrl}
                                            target="_blank"
                                            style={{
                                                padding: '0.65rem 1.25rem',
                                                borderRadius: '10px',
                                                background: `linear-gradient(135deg, ${accentColorHex} 0%, ${brandColorHex} 80%)`,
                                                color: 'white',
                                                textDecoration: 'none',
                                                fontSize: '0.9rem',
                                                fontWeight: 500,
                                            }}
                                        >
                                            Open Image
                                        </Link>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>

            </div>
        </div>
    );
}
