import type { SVGProps } from 'react';

/**
 * Supported visual directions for the shared arrow icon.
 */
type ArrowDirection = 'UP' | 'RIGHT' | 'DOWN' | 'LEFT';

/**
 * SVG transform mapping used to rotate the canonical right-pointing arrow path.
 */
const ARROW_TRANSFORM_BY_DIRECTION: Readonly<Record<ArrowDirection, string | undefined>> = {
    UP: 'rotate(270 12 12)',
    RIGHT: undefined,
    DOWN: 'rotate(90 12 12)',
    LEFT: 'rotate(180 12 12)',
};

/**
 * Props for the shared arrow icon used across Agents Server.
 */
type ArrowIconProps = Omit<SVGProps<SVGSVGElement>, 'viewBox'> & {
    /**
     * Visual direction of the arrow.
     */
    readonly direction: ArrowDirection;

    /**
     * Optional icon size in pixels.
     */
    readonly size?: number;
};

/**
 * Renders a reusable arrow icon with unified geometry and stroke styling.
 *
 * @param props - Rendering configuration for the arrow icon.
 * @returns Arrow icon SVG.
 */
export function ArrowIcon({ direction, size = 24, className, ...props }: ArrowIconProps) {
    const transform = ARROW_TRANSFORM_BY_DIRECTION[direction];

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden={props['aria-hidden'] ?? true}
            className={className}
            {...props}
        >
            <g transform={transform}>
                <path
                    d="M7.5 6 17.5 12l-10 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </g>
        </svg>
    );
}
