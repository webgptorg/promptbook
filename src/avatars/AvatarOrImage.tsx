'use client';

import type { CSSProperties } from 'react';
import type { string_css_class, string_url_image } from '../types/typeAliases';
import { Avatar } from './Avatar';
import type { AvatarDefinition } from './types/AvatarDefinition';
import type { AvatarVisualId } from './types/AvatarVisualDefinition';

/**
 * Shared avatar-rendering props for places that may receive either an image URL or a deterministic avatar visual.
 *
 * @private shared component for avatar media rendering
 */
export type AvatarOrImageProps = {
    /**
     * Explicit image URL to render.
     */
    readonly imageUrl?: string_url_image | null;

    /**
     * Deterministic avatar definition used by built-in visuals.
     */
    readonly avatarDefinition?: AvatarDefinition | null;

    /**
     * Selected built-in visual id used with `avatarDefinition`.
     */
    readonly visualId?: AvatarVisualId | null;

    /**
     * Output size in CSS pixels.
     */
    readonly size: number;

    /**
     * Accessible label used for the rendered media.
     */
    readonly alt: string;

    /**
     * Optional CSS class name applied to the rendered element.
     */
    readonly className?: string_css_class;

    /**
     * Optional inline styles forwarded to the rendered element.
     */
    readonly style?: CSSProperties;
};

/**
 * Renders either a static image or a deterministic canvas avatar using one common prop shape.
 *
 * @private shared component for avatar media rendering
 */
export function AvatarOrImage(props: AvatarOrImageProps) {
    const { imageUrl, avatarDefinition, visualId, size, alt, className, style } = props;

    if (avatarDefinition && visualId) {
        return (
            <Avatar
                avatarDefinition={avatarDefinition}
                visualId={visualId}
                size={size}
                title={alt}
                className={className}
                style={style}
            />
        );
    }

    if (!imageUrl) {
        return null;
    }

    return (
        <img
            src={imageUrl}
            alt={alt}
            className={className}
            style={{
                width: size,
                height: size,
                display: 'block',
                objectFit: 'cover',
                ...style,
            }}
        />
    );
}
