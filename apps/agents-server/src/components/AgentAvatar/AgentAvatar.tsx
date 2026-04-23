'use client';

import type { AgentBasicInformation } from '@promptbook-local/types';
import type { CSSProperties } from 'react';
import { AvatarOrImage } from '../../../../../src/avatars/AvatarOrImage';
import type { AvatarSurfaceStyle, AvatarVisualId } from '../../../../../src/avatars/types/AvatarVisualDefinition';
import { resolveAgentAvatar } from '../../../../../src/utils/agents/resolveAgentAvatarImageUrl';
import { useDefaultAgentAvatarVisualId } from './DefaultAgentAvatarVisualProvider';

/**
 * Agent shape accepted by the shared Agents Server avatar renderer.
 *
 * @private shared type of Agents Server avatar components
 */
type AgentAvatarAgent = Pick<AgentBasicInformation, 'agentName' | 'agentHash' | 'permanentId' | 'meta'> & {
    /**
     * Optional marker forwarded by remote profile payloads when `meta.image` is only the static fallback route.
     */
    readonly isMetaImageExplicit?: boolean;

    /**
     * Optional built-in avatar visual preferred by the agent/profile payload.
     */
    readonly avatarVisualId?: AvatarVisualId;
};

/**
 * Props for the shared agents-server avatar renderer.
 *
 * @private shared component of Agents Server
 */
type AgentAvatarProps = {
    /**
     * Agent metadata used to resolve either `META IMAGE` or the default avatar visual.
     */
    readonly agent: AgentAvatarAgent;

    /**
     * Optional base URL used to resolve relative `META IMAGE` values.
     */
    readonly baseUrl?: string;

    /**
     * Output size in CSS pixels.
     */
    readonly size: number;

    /**
     * Surface used when rendering a built-in avatar visual.
     */
    readonly surface?: AvatarSurfaceStyle;

    /**
     * Accessible label for the rendered avatar.
     */
    readonly alt?: string;

    /**
     * CSS classes applied to the rendered visual/canvas.
     */
    readonly className?: string;

    /**
     * Optional CSS classes applied only to the `<img/>` variant.
     */
    readonly imageClassName?: string;

    /**
     * Optional inline styles forwarded to the rendered media.
     */
    readonly style?: CSSProperties;
};

/**
 * Renders either the explicit agent image or the shared animated default avatar visual.
 *
 * @private shared component of Agents Server
 */
export function AgentAvatar({ agent, baseUrl, size, surface, alt, className, imageClassName, style }: AgentAvatarProps) {
    const defaultAgentAvatarVisualId = useDefaultAgentAvatarVisualId();
    const resolvedAgentAvatar = resolveAgentAvatar({
        agent: {
            ...agent,
            avatarVisualId: agent.avatarVisualId || defaultAgentAvatarVisualId,
        },
        baseUrl,
    });
    const fallbackAlt = alt || agent.meta.fullname || agent.agentName || 'Agent avatar';

    return (
        <AvatarOrImage
            size={size}
            alt={fallbackAlt}
            className={resolvedAgentAvatar?.type === 'image' ? imageClassName || className : className}
            style={style}
            imageUrl={resolvedAgentAvatar?.type === 'image' ? resolvedAgentAvatar.imageUrl : undefined}
            avatarDefinition={resolvedAgentAvatar?.type === 'visual' ? resolvedAgentAvatar.avatarDefinition : undefined}
            visualId={resolvedAgentAvatar?.type === 'visual' ? resolvedAgentAvatar.visualId : undefined}
            surface={surface}
        />
    );
}
