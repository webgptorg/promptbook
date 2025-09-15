'use client';

/**
 * Shows simple arrow icon pointing up or down
 *
 * @public exported from `@promptbook/components`
 */
export const ArrowIcon = ({ direction, size }: { direction: string; size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d={direction === 'DOWN' ? 'M7 10l5 5 5-5z' : 'M7 14l5-5 5 5z'} />
    </svg>
);
