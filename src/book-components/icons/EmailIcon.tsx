/**
 * Props for the EmailIcon component.
 */
type EmailIconProps = {
    size?: number;
    color?: string;
};

/**
 * Renders an email/envelope icon.
 *
 * @param props - SVG properties augmented with an optional `size`
 * @private internal subcomponent used by various components
 */
export function EmailIcon({ size = 24, color = 'currentColor' }: EmailIconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M4 6h16a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M22 8l-10 6L2 8"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
