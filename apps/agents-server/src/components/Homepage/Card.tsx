import React from 'react';

/**
 * Props for card.
 */
type CardProps = {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
};

/**
 * Handles card.
 */
export function Card({ children, className = '', style }: CardProps) {
    return (
        <div
            className={`block h-full p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 border border-gray-200 hover:border-blue-400 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100 dark:shadow-slate-950/30 dark:hover:border-blue-400/70 ${className}`}
            style={style}
        >
            {children}
        </div>
    );
}
