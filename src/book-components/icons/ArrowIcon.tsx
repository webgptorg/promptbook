'use client';

import { classNames } from '../_common/react-utils/classNames';

/**
 * Supported arrow directions.
 *
 * @private internal typing helper for `<ArrowIcon/>`
 */
type ArrowDirection = 'up' | 'down' | 'left' | 'right';

/**
 * Legacy direction aliases kept for backward compatibility.
 *
 * @private internal typing helper for `<ArrowIcon/>`
 */
type LegacyArrowDirection = Uppercase<ArrowDirection>;

/**
 * Any accepted arrow direction input.
 *
 * @private internal typing helper for `<ArrowIcon/>`
 */
type ArrowDirectionInput = ArrowDirection | LegacyArrowDirection;

/**
 * Props for rendering a directional arrow icon.
 *
 * @private internal props typing for `<ArrowIcon/>`
 */
type ArrowIconProps = {
    /**
     * Arrow pointing direction.
     *
     * Uses lowercase directions (`up`, `down`, `left`, `right`) and supports
     * uppercase legacy values for backward compatibility.
     */
    readonly direction: ArrowDirectionInput;
    /**
     * Icon size in pixels.
     */
    readonly size?: number;
    /**
     * Optional class names forwarded to the `<svg/>`.
     */
    readonly className?: string;
};

/**
 * Rotation (in degrees) applied to the default right-pointing triangle.
 *
 * @private internal helper map for `<ArrowIcon/>`
 */
const ARROW_ROTATION_BY_DIRECTION: Record<ArrowDirection, number> = {
    right: 0,
    down: 90,
    left: 180,
    up: 270,
};

/**
 * Normalizes any accepted direction input to lowercase.
 *
 * @param direction - Raw direction value.
 * @returns Lowercase arrow direction.
 * @private internal helper for `<ArrowIcon/>`
 */
function normalizeArrowDirection(direction: ArrowDirectionInput): ArrowDirection {
    return direction.toLowerCase() as ArrowDirection;
}

/**
 * Shows a simple solid triangle arrow ("▶") that can point in all four directions.
 *
 * @public exported from `@promptbook/components`
 */
export function ArrowIcon({ direction, size = 24, className }: ArrowIconProps) {
    const normalizedDirection = normalizeArrowDirection(direction);
    const rotationDegrees = ARROW_ROTATION_BY_DIRECTION[normalizedDirection];

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
            className={classNames('shrink-0', className)}
        >
            <g transform={`rotate(${rotationDegrees} 12 12)`}>
                <path d="M7 5.5L18.5 12L7 18.5V5.5Z" />
            </g>
        </svg>
    );
}
