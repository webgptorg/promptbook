/**
 * Props for the TeacherIcon component.
 */
type TeacherIconProps = {
    size?: number;
    color?: string;
};

/**
 * Renders a teacher/graduation cap icon.
 *
 * @param props - SVG properties augmented with an optional `size`
 * @private internal subcomponent used by various components
 */
export function TeacherIcon({ size = 24, color = 'currentColor' }: TeacherIconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M2 9l10-5 10 5-10 5-10-5z"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M6 12v3.5c0 1.5 3 3 6 3s6-1.5 6-3V12"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path d="M20 10v4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
