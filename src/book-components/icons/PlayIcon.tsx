'use client';

/**
 * Play icon (triangle) used for resume action
 *
 * @public exported from `@promptbook/components`
 */
export const PlayIcon = ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" role="img" aria-label="Play">
        <path d="M8 5v14l11-7L8 5z" />
    </svg>
);
