'use client';

/**
 * Supported directions for the sidebar toggle arrow.
 */
type SidebarToggleArrowDirection = 'LEFT' | 'RIGHT';

/**
 * Props for the sidebar toggle arrow icon.
 */
type SidebarToggleArrowProps = {
    /**
     * Arrow direction, either pointing left to collapse or right to expand.
     */
    direction: SidebarToggleArrowDirection;
    /**
     * Size of the icon in pixels.
     */
    size?: number;
    /**
     * Optional class name(s) forwarded to the SVG element.
     */
    className?: string;
};

/**
 * Renders a simple arrow icon used for toggling the chat sidebar collapse state.
 *
 * @param props - Properties for the arrow icon.
 * @returns The rendered SVG arrow.
 */
export function SidebarToggleArrow({ direction, size = 24, className = '' }: SidebarToggleArrowProps) {
    const transform = direction === 'LEFT' ? 'rotate(180 12 12)' : undefined;

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className={className}
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
