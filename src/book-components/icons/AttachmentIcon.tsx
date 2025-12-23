type AttachmentIconProps = {
    size?: number;
    color?: string;
};

/**
 * Renders an attachment icon
 *
 * @public exported from `@promptbook/components`
 */
export function AttachmentIcon({ size = 24, color = 'currentColor' }: AttachmentIconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66L9.64 16.2a2 2 0 01-2.83-2.83l8.49-8.49"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
