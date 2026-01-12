import React from 'react';

type CardProps = {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
};

export function Card({ children, className = '', style }: CardProps) {
    return (
        <div
            className={`block h-full p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-200 hover:border-blue-300 hover:bg-gray-50/30 ${className}`}
            style={style}
        >
            {children}
        </div>
    );
}
