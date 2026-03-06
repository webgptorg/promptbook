'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';

/**
 * @private Props needed to render an agent label with avatar inside header menus.
 */
export type AgentNameWithAvatarProps = {
    /** Human-readable label displayed next to the avatar. */
    readonly label: string;
    /** Resolved avatar URL or null when unavailable. */
    readonly avatarUrl: string | null;
    /** Optional Tailwind classes sizing the avatar circle. */
    readonly avatarSizeClassName?: string;
    /** Optional Tailwind classes styling the text portion. */
    readonly textClassName?: string;
    /** Optional Tailwind classes constraining the label width. */
    readonly maxWidthClassName?: string;
    /** Optional fallback content rendered when no avatar is present. */
    readonly fallbackIcon?: ReactNode;
};

/**
 * @private Renders an avatar badge alongside the agent name.
 */
export function AgentNameWithAvatar({
    label,
    avatarUrl,
    avatarSizeClassName,
    textClassName,
    maxWidthClassName,
    fallbackIcon,
}: AgentNameWithAvatarProps) {
    const safeLabel = label || 'Agent';
    const fallbackLetter = safeLabel.split('/').pop()?.trim().charAt(0)?.toUpperCase() || 'A';
    const avatarSize = avatarSizeClassName ?? 'h-5 w-5';
    const textClasses = `truncate ${textClassName ?? 'text-sm font-semibold text-gray-900'} ${
        maxWidthClassName ?? ''
    }`.trim();
    const fallbackContent = fallbackIcon ?? fallbackLetter;

    return (
        <span className="flex min-w-0 items-center gap-2">
            <span
                className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-white text-xs font-semibold uppercase text-gray-500 ${avatarSize}`}
            >
                {avatarUrl ? (
                    <Image
                        src={avatarUrl}
                        alt={`${safeLabel} avatar`}
                        className="h-full w-full object-cover"
                        width={64}
                        height={64}
                        unoptimized
                        loading="lazy"
                        decoding="async"
                    />
                ) : (
                    fallbackContent
                )}
            </span>
            <span className={textClasses}>{safeLabel}</span>
        </span>
    );
}
