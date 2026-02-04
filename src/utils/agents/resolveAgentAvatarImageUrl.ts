import { generatePlaceholderAgentProfileImageUrl } from '../../book-2.0/utils/generatePlaceholderAgentProfileImageUrl';
import type { AgentBasicInformation } from '../../book-2.0/agent-source/AgentBasicInformation';
import type { string_url, string_url_image } from '../../types/typeAliases';

/**
 * Options for resolving agent avatar URLs.
 */
export type ResolveAgentAvatarImageUrlOptions = {
    /**
     * Agent metadata used for avatar resolution.
     */
    readonly agent: Pick<AgentBasicInformation, 'agentName' | 'permanentId' | 'meta'>;
    /**
     * Optional base URL used to resolve relative meta images and placeholders.
     */
    readonly baseUrl?: string_url;
};

/**
 * Resolve a base URL for relative images, preferring the provided base or browser location.
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
 * Resolve the fallback avatar URL for an agent.
 */
export function resolveAgentAvatarFallbackUrl(
    options: ResolveAgentAvatarImageUrlOptions,
): string_url_image | null {
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
 * Resolve the best avatar URL for an agent, preferring META IMAGE and falling back to placeholders.
 */
export function resolveAgentAvatarImageUrl(options: ResolveAgentAvatarImageUrlOptions): string_url_image | null {
    const { agent, baseUrl } = options;
    const metaImage = agent.meta?.image;

    if (metaImage) {
        return resolveMetaImageUrl(metaImage, resolveImageBaseUrl(baseUrl));
    }

    return resolveAgentAvatarFallbackUrl(options);
}
