import React from 'react';

type CardProps = {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
};

export function Card({ children, className = '', style }: CardProps) {
    return (
        <div
            className={`block h-full p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 border border-gray-200 hover:border-blue-400 ${className}`}
            style={style}
        >
            {children}
        </div>
    );
}
