'use client';

/**
 * Stop icon (square)
 *
 * @public exported from `@promptbook/components`
 */
export const StopIcon = ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" role="img" aria-label="Stop">
        <rect x="5" y="5" width="14" height="14" rx="2" />
    </svg>
);
