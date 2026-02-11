'use client';

/**
 * Supported arrow directions.
 *
 * @private internal typing helper for `<ArrowIcon/>`
 */
type ArrowDirection = 'DOWN' | 'UP';

/**
 * Props for rendering a directional arrow icon.
 *
 * @private internal props typing for `<ArrowIcon/>`
 */
type ArrowIconProps = {
    direction: ArrowDirection;
    size: number;
};

/**
 * Shows simple arrow icon pointing up or down
 *
 * @public exported from `@promptbook/components`
 */
export const ArrowIcon = ({ direction, size }: ArrowIconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <g transform={direction === 'UP' ? 'rotate(180 12 12)' : undefined}>
            <path d="M12 6v10.25" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
            <path d="M7.2 12.6 12 17.4l4.8-4.8" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
            <path d="m8.8 8.6 3.2 3.2 3.2-3.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </g>
    </svg>
);
