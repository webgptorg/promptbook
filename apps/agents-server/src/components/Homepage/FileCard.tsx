import React from 'react';

/**
 * Shared button styles for action controls on file-like cards.
 */
export const FILE_ACTION_BUTTON_CLASSES =
    'text-white px-2 py-1 rounded shadow text-[10px] font-semibold uppercase tracking-wider opacity-80 hover:opacity-100';

/**
 * Props for the FileCard component.
 */
type FileCardProps = {
    /**
     * Content rendered inside the card.
     */
    readonly children: React.ReactNode;
    /**
     * Optional class overrides for the card container.
     */
    readonly className?: string;
    /**
     * Optional inline styles for the card container.
     */
    readonly style?: React.CSSProperties;
};

/**
 * Renders a compact, file-like card shell for list/grid items.
 */
export function FileCard({ children, className = '', style }: FileCardProps) {
    return (
        <div
            className={`block h-full rounded-lg border border-gray-200 bg-white/80 p-3 shadow-sm transition-[box-shadow,transform,border-color] duration-200 hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5 ${className}`}
            style={style}
        >
            {children}
        </div>
    );
}
