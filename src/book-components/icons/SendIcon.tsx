'use client';

/**
 * Shows simple send icon
 *
 * @public exported from `@promptbook/components`
 */
export const SendIcon = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
);
