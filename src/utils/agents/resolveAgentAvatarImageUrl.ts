import { createAvatarDefinitionFromAgentBasicInformation } from '../../avatars/avatarRenderingUtils';
import type { AvatarDefinition } from '../../avatars/types/AvatarDefinition';
import type { AvatarVisualId } from '../../avatars/types/AvatarVisualDefinition';
import { resolveAvatarVisualId } from '../../avatars/visuals/avatarVisualRegistry';
import type { AgentBasicInformation } from '../../book-2.0/agent-source/AgentBasicInformation';
import { generatePlaceholderAgentProfileImageUrl } from '../../book-2.0/utils/generatePlaceholderAgentProfileImageUrl';
import type { string_url } from '../../types/string_url';
import type { string_url_image } from '../../types/string_url_image';

/**
 * Options for resolving agent avatar URLs.
 *
 * @private utility of `<Chat/>`
 */
export type ResolveAgentAvatarOptions = {
    /**
     * Agent metadata used for avatar resolution.
     */
    readonly agent: Pick<AgentBasicInformation, 'agentName' | 'agentHash' | 'permanentId' | 'meta'> & {
        /**
         * Optional explicit marker coming from remote profile payloads.
         * When `false`, `meta.image` is treated as the generated static fallback rather than a user-defined `META IMAGE`.
         */
        readonly isMetaImageExplicit?: boolean;

        /**
         * Optional preferred avatar visual id coming from remote profile payloads.
         */
        readonly avatarVisualId?: AvatarVisualId;

        /**
         * Optional server-wide fallback visual id forwarded by federated server payloads.
         */
        readonly defaultAgentAvatarVisualId?: AvatarVisualId;
    };
    /**
     * Optional base URL used to resolve relative meta images and placeholders.
     */
    readonly baseUrl?: string_url;
};

/**
 * Backward-compatible alias kept for callers that only need image URLs.
 *
 * @private utility of `<Chat/>`
 */
export type ResolveAgentAvatarImageUrlOptions = ResolveAgentAvatarOptions;

/**
 * Default built-in avatar visual used when an agent does not define `META IMAGE`.
 *
 * @private shared avatar contract
 */
export const DEFAULT_AGENT_AVATAR_VISUAL_ID: AvatarVisualId = 'octopus3d3';

/**
 * Resolved avatar descriptor used by interactive UIs to pick either an image or a live canvas visual.
 *
 * @private shared avatar contract
 */
export type ResolvedAgentAvatar =
    | {
          readonly type: 'image';
          readonly imageUrl: string_url_image;
      }
    | {
          readonly type: 'visual';
          readonly avatarDefinition: AvatarDefinition;
          readonly visualId: AvatarVisualId;
      };

/**
 * Resolves the avatar visual preferred by an agent, then falls back to a federated server default
 * and finally to the caller/server default.
 *
 * @param agent Agent metadata and optional remote-profile visual id.
 * @param defaultAvatarVisualId Optional metadata-resolved server default.
 * @returns Supported avatar visual id.
 *
 * @private shared avatar contract
 */
export function resolveAgentAvatarVisualId(
    agent: ResolveAgentAvatarOptions['agent'],
    defaultAvatarVisualId: AvatarVisualId = DEFAULT_AGENT_AVATAR_VISUAL_ID,
): AvatarVisualId {
    return (
        resolveAvatarVisualId(agent.meta?.avatar) ||
        agent.avatarVisualId ||
        agent.defaultAgentAvatarVisualId ||
        defaultAvatarVisualId
    );
}

/**
 * Resolve a base URL for relative images, preferring the provided base or browser location.
 *
 * @private utility of `<Chat/>`
 */
function resolveImageBaseUrl(baseUrl?: string_url): string | null {
    if (baseUrl) {
        try {
            return new URL(baseUrl).href;
        } catch {
            return null;
        }
    }

    if (typeof window !== 'undefined') {
        return window.location.href;
    }

    return null;
}

/**
 * Resolve a base URL for placeholders, preferring server origin or browser origin.
 *
 * @private utility of `<Chat/>`
 */
function resolvePlaceholderBaseUrl(baseUrl?: string_url): string_url | null {
    if (baseUrl) {
        try {
            return new URL(baseUrl).origin as string_url;
        } catch {
            return null;
        }
    }

    if (typeof window !== 'undefined') {
        return window.location.origin as string_url;
    }

    return null;
}

/**
 * Resolve a meta image URL to an absolute or usable path.
 *
 * @private utility of `<Chat/>`
 */
function resolveMetaImageUrl(metaImage: string_url_image, baseUrl: string | null): string_url_image {
    if (
        metaImage.startsWith('http://') ||
        metaImage.startsWith('https://') ||
        metaImage.startsWith('data:') ||
        metaImage.startsWith('blob:')
    ) {
        return metaImage;
    }

    if (!baseUrl) {
        return metaImage;
    }

    try {
        return new URL(metaImage, baseUrl).href as string_url_image;
    } catch {
        return metaImage;
    }
}

/**
 * Creates the deterministic avatar definition used by built-in canvas visuals.
 *
 * @private utility of `<Chat/>`
 */
function createResolvedAvatarDefinition(agent: ResolveAgentAvatarOptions['agent']): AvatarDefinition {
    return createAvatarDefinitionFromAgentBasicInformation({
        agentName: agent.agentName || agent.permanentId || 'Agent',
        agentHash: agent.agentHash || agent.permanentId || agent.agentName,
        meta: agent.meta || {},
    });
}

/**
 * Resolve the fallback avatar URL for an agent.
 *
 * @private utility of `<Chat/>`
 */
export function resolveAgentAvatarFallbackUrl(options: ResolveAgentAvatarOptions): string_url_image | null {
    const { agent, baseUrl } = options;
    const agentId = agent.permanentId || agent.agentName;

    if (!agentId) {
        return null;
    }

    const placeholderBase = resolvePlaceholderBaseUrl(baseUrl);
    if (placeholderBase) {
        return generatePlaceholderAgentProfileImageUrl(agentId, placeholderBase);
    }

    return `/agents/${encodeURIComponent(agentId)}/images/default-avatar.png` as string_url_image;
}

/**
 * Resolve the best avatar representation for an agent, preferring explicit `META IMAGE`
 * and otherwise returning the default deterministic canvas visual.
 *
 * @private utility of `<Chat/>`
 */
export function resolveAgentAvatar(options: ResolveAgentAvatarOptions): ResolvedAgentAvatar | null {
    const { agent, baseUrl } = options;
    const metaImage = agent.meta?.image;
    const isMetaImageExplicit = agent.isMetaImageExplicit !== false;

    if (metaImage && isMetaImageExplicit) {
        return {
            type: 'image',
            imageUrl: resolveMetaImageUrl(metaImage, resolveImageBaseUrl(baseUrl)),
        };
    }

    if (!agent.agentName && !agent.permanentId) {
        return null;
    }

    return {
        type: 'visual',
        avatarDefinition: createResolvedAvatarDefinition(agent),
        visualId: resolveAgentAvatarVisualId(agent),
    };
}

/**
 * Resolve the best avatar URL for an agent, preferring `META IMAGE` and falling back to the static placeholder route.
 *
 * @private utility of `<Chat/>`
 */
export function resolveAgentAvatarImageUrl(options: ResolveAgentAvatarOptions): string_url_image | null {
    const resolvedAgentAvatar = resolveAgentAvatar(options);

    if (resolvedAgentAvatar?.type === 'image') {
        return resolvedAgentAvatar.imageUrl;
    }

    return resolveAgentAvatarFallbackUrl(options);
}
