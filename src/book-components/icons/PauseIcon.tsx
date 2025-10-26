'use client';

/**
 * Pause icon (two vertical bars)
 *
 * @public exported from `@promptbook/components`
 */
export const PauseIcon = ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" role="img" aria-label="Pause">
        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
    </svg>
);
