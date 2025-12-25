// SaveIcon.tsx
import React from 'react';

/**
 * Renders a save icon.
 *
 * This icon is typically used in buttons that trigger the saving of data,
 * configurations, or agent sources.
 *
 * @param props - SVG properties augmented with an optional `size`
 * @private internal subcomponent used by various components
 */
export function SaveIcon({
    size = 20,
    color = 'currentColor',
    ...props
}: { size?: number; color?: string } & React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            {/* Chat bubble */}
            <path
                d="M4 17V7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H7l-3 3z"
                fill={color}
                fillOpacity="0.08"
                stroke={color}
            />
            {/* Downward arrow inside bubble */}
            <path d="M12 9v5" stroke={color} />
            <path d="M9.5 12.5L12 15l2.5-2.5" stroke={color} />
        </svg>
    );
}
