import { PROMPTBOOK_COLOR } from '@promptbook-local/core';
import type { ReactNode } from 'react';
import { $provideServer } from '@/src/tools/$provideServer';
import { Color } from '../../../../../../../../src/utils/color/Color';
import { darken } from '../../../../../../../../src/utils/color/operators/darken';
import { grayscale } from '../../../../../../../../src/utils/color/operators/grayscale';
import { lighten } from '../../../../../../../../src/utils/color/operators/lighten';
import { textColor } from '../../../../../../../../src/utils/color/operators/furthest';
import { resolveAgentAvatarImageUrl } from '../../../../../../../../src/utils/agents/resolveAgentAvatarImageUrl';
import type { WithTake } from '../../../../../../../../src/utils/take/interfaces/ITakeChain';
import { AGENT_ACTIONS, getAgentName, getAgentProfile } from '../_utils';

/**
 * Options returned by the shared agent image helpers.
 *
 * @public
 */
export interface AgentImageContext {
    readonly agentName: string;
    readonly agentProfile: Awaited<ReturnType<typeof getAgentProfile>>;
    readonly iconUrl: string;
    readonly agentColor: WithTake<Color>;
    readonly backgroundColor: WithTake<Color>;
    readonly publicUrl: URL;
}

/**
 * Orientation options for agent screenshot previews.
 *
 * @public
 */
export type AgentScreenshotOrientation = 'landscape' | 'portrait';

/**
 * Loads agent metadata, colors, and asset URLs that are shared between image generators.
 *
 * @param params - Route parameters containing the agent name.
 * @returns Shared context describing the agent and color scheme.
 * @public
 */
export async function getAgentImageContext(params: Promise<{ agentName: string }>): Promise<AgentImageContext> {
    const agentName = await getAgentName(params);
    const agentProfile = await getAgentProfile(agentName);
    const agentColor = Color.fromSafe(agentProfile.meta.color || PROMPTBOOK_COLOR);
    const backgroundColor = agentColor.then(grayscale(0.55));
    const { publicUrl } = await $provideServer();
    const fallbackId = agentProfile.permanentId || agentName;
    const resolvedIcon = resolveAgentAvatarImageUrl({
        agent: agentProfile,
        baseUrl: publicUrl.href,
    });

    const iconUrl =
        resolvedIcon ||
        `/agents/${encodeURIComponent(fallbackId)}/images/default-avatar.png` as const;

    return {
        agentName,
        agentProfile,
        iconUrl,
        agentColor,
        backgroundColor,
        publicUrl,
    };
}

/**
 * Renders the 256×256 icon layout that frames the agent avatar in a polished gradient capsule.
 *
 * @param context - Shared agent image context.
 * @returns A React node suitable for `next/og` responses.
 * @public
 */
export function createAgentIconLayout(context: AgentImageContext): ReactNode {
    const heroName = context.agentProfile.meta.fullname || context.agentName;
    const initials =
        heroName
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((word) => word[0]!.toUpperCase())
            .join('') || 'AI';
    const halo = context.agentColor.then(lighten(0.18));
    const depth = context.agentColor.then(darken(0.36));
    const rim = context.agentColor.then(grayscale(0.6));
    const textHex = context.agentColor.then(textColor).toHex();

    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                borderRadius: '28px',
                padding: '12px',
                background: `radial-gradient(circle at 30% 30%, ${halo.toHex()}, ${depth.toHex()})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box',
                overflow: 'hidden',
            }}
        >
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    background: `linear-gradient(160deg, ${halo.toHex()}, ${rim.toHex()})`,
                    boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={context.iconUrl}
                    alt={`${heroName} avatar`}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        filter: 'saturate(1.1) contrast(1.05)',
                    }}
                />
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background:
                            'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.18), transparent 60%),' +
                            'radial-gradient(circle at 70% 10%, rgba(255,255,255,0.12), transparent 60%)',
                    }}
                />
                <div
                    style={{
                        position: 'absolute',
                        bottom: '16px',
                        left: '16px',
                        padding: '5px 12px',
                        borderRadius: '999px',
                        backgroundColor: 'rgba(0,0,0,0.45)',
                        color: '#fff',
                        fontSize: '0.68rem',
                        letterSpacing: '0.2em',
                    }}
                >
                    {initials}
                </div>
                <div
                    style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4px 10px',
                        borderRadius: '999px',
                        backgroundColor: 'rgba(255,255,255,0.28)',
                        color: textHex,
                        fontSize: '0.65rem',
                        letterSpacing: '0.18em',
                    }}
                >
                    AGENT
                </div>
            </div>
        </div>
    );
}

/**
 * Renders the card-oriented layout that forms landscape/portrait screenshot previews.
 *
 * @param context - Shared agent image context.
 * @param orientation - Layout orientation.
 * @returns A React node representing the screenshot.
 * @public
 */
export function createAgentScreenshotLayout(
    context: AgentImageContext,
    orientation: AgentScreenshotOrientation,
): ReactNode {
    const heroName = context.agentProfile.meta.fullname || context.agentName;
    const personaDescription = (context.agentProfile.personaDescription || 'Always ready to collaborate.').replace(
        /\s+/g,
        ' ',
    );
    const trimmedDescription =
        personaDescription.length > 180 ? `${personaDescription.slice(0, 177).trim()}…` : personaDescription;
    const isPortrait = orientation === 'portrait';
    const accent = context.agentColor.then(lighten(0.18));
    const depth = context.agentColor.then(darken(0.32));
    const muted = context.backgroundColor;
    const textHex = context.agentColor.then(textColor).toHex();

    const cardBackground = `linear-gradient(135deg, ${depth.toHex()}, ${muted.toHex()})`;
    const overlayColor = `rgba(0,0,0,${isPortrait ? 0.45 : 0.38})`;
    const actionChips = AGENT_ACTIONS.slice(0, 3);

    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                padding: isPortrait ? '48px 36px' : '64px 80px',
                boxSizing: 'border-box',
                background: `linear-gradient(145deg, ${accent.toHex()}, ${depth.toHex()})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: '"Space Grotesk", "Inter", system-ui, sans-serif',
            }}
        >
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '36px',
                    background: cardBackground,
                    boxShadow: '0 35px 70px rgba(0,0,0,0.45)',
                    display: 'flex',
                    flexDirection: isPortrait ? 'column' : 'row',
                    gap: '2.5rem',
                    padding: isPortrait ? '36px' : '48px',
                    position: 'relative',
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '36px',
                        background: overlayColor,
                    }}
                />
                <div
                    style={{
                        position: 'absolute',
                        inset: '2px',
                        borderRadius: '34px',
                        pointerEvents: 'none',
                        border: `1px solid rgba(255,255,255,0.18)`,
                    }}
                />
                <div
                    style={{
                        display: 'flex',
                        flexDirection: isPortrait ? 'row' : 'column',
                        justifyContent: 'space-between',
                        alignItems: isPortrait ? 'flex-start' : 'stretch',
                        width: isPortrait ? '100%' : '320px',
                        zIndex: 1,
                        gap: '1rem',
                    }}
                >
                    <div
                        style={{
                            width: isPortrait ? '160px' : '100%',
                            aspectRatio: '1 / 1',
                            borderRadius: '32px',
                            background: `linear-gradient(160deg, ${accent.toHex()}, ${depth.toHex()})`,
                            boxShadow: '0 20px 50px rgba(0,0,0,0.45)',
                            position: 'relative',
                            overflow: 'hidden',
                        }}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={context.iconUrl}
                            alt={`${heroName} preview`}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                filter: 'saturate(1.05) contrast(1.08)',
                            }}
                        />
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                background:
                                    'linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.65) 100%)',
                            }}
                        />
                        <div
                            style={{
                                position: 'absolute',
                                bottom: '12px',
                                left: '12px',
                                padding: '6px 14px',
                                borderRadius: '999px',
                                backgroundColor: 'rgba(255,255,255,0.22)',
                                color: '#fff',
                                fontSize: '0.75rem',
                                letterSpacing: '0.2em',
                            }}
                        >
                            STARLIT
                        </div>
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem',
                            flex: 1,
                            zIndex: 1,
                        }}
                    >
                        <p
                            style={{
                                margin: 0,
                                fontSize: isPortrait ? '48px' : '66px',
                                fontWeight: 600,
                                color: textHex,
                            }}
                        >
                            {heroName}
                        </p>
                        <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '1rem' }}>
                            Modern intelligence for the next conversation.
                        </p>
                        <p
                            style={{
                                margin: 0,
                                color: 'rgba(255,255,255,0.85)',
                                fontSize: '1.2rem',
                                lineHeight: 1.5,
                            }}
                        >
                            {trimmedDescription}
                        </p>
                        <div
                            style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '0.6rem',
                            }}
                        >
                            {actionChips.map((action) => (
                                <span
                                    key={action}
                                    style={{
                                        padding: '4px 10px',
                                        borderRadius: '999px',
                                        border: `1px solid ${accent.toHex()}`,
                                        color: '#fff',
                                        fontSize: '0.78rem',
                                        backgroundColor: 'rgba(255,255,255,0.05)',
                                    }}
                                >
                                    {action}
                                </span>
                            ))}
                        </div>
                        <div
                            style={{
                                marginTop: 'auto',
                                padding: '1rem 1.25rem',
                                borderRadius: '20px',
                                backgroundColor: 'rgba(255,255,255,0.05)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}
                        >
                            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>
                                Always listening, always learning.
                            </span>
                            <span
                                style={{
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '50%',
                                    backgroundColor: accent.toHex(),
                                    boxShadow: '0 0 12px rgba(255,255,255,0.8)',
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
