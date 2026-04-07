import Image from 'next/image';
import type { ReactNode } from 'react';

/**
 * Props for the agent label that includes its avatar.
 *
 * @private type of Header
 */
type AgentNameWithAvatarProps = {
    /**
     * Human-readable label for the agent.
     */
    readonly label: string;

    /**
     * Resolved avatar image URL or null when missing.
     */
    readonly avatarUrl: string | null;

    /**
     * Tailwind classes used to size the avatar element.
     */
    readonly avatarSizeClassName?: string;

    /**
     * Tailwind classes that style the text portion of the label.
     */
    readonly textClassName?: string;

    /**
     * Tailwind classes that limit the label width.
     */
    readonly maxWidthClassName?: string;

    /**
     * Optional fallback content when no avatar URL is provided.
     */
    readonly fallbackIcon?: ReactNode;
};

/**
 * Renders an agent label with a rounded avatar circle preceding the text.
 *
 * @private function of Header
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
                        className="agent-avatar-pixelated h-full w-full object-cover"
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
