import React from 'react';

/**
 * Renders a nice clock icon with a specific time.
 *
 * @private internal subcomponent of `<Chat>` component
 */
export function ClockIcon({ date, size = 100 }: { date: Date; size?: number }) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();

    const hourDeg = (hours % 12) * 30 + minutes * 0.5;
    const minuteDeg = minutes * 6;
    const secondDeg = seconds * 6;

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
        >
            {/* Clock face */}
            <circle cx="50" cy="50" r="45" fill="white" stroke="#333" strokeWidth="2" />

            {/* Hour markers */}
            {[...Array(12)].map((_, i) => (
                <line
                    key={i}
                    x1="50"
                    y1="12"
                    x2="50"
                    y2="18"
                    transform={`rotate(${i * 30} 50 50)`}
                    stroke="#333"
                    strokeWidth="2"
                />
            ))}

            {/* Hour hand */}
            <line
                x1="50"
                y1="50"
                x2="50"
                y2="25"
                transform={`rotate(${hourDeg} 50 50)`}
                stroke="#333"
                strokeWidth="4"
                strokeLinecap="round"
            />

            {/* Minute hand */}
            <line
                x1="50"
                y1="50"
                x2="50"
                y2="15"
                transform={`rotate(${minuteDeg} 50 50)`}
                stroke="#666"
                strokeWidth="3"
                strokeLinecap="round"
            />

            {/* Second hand */}
            <line
                x1="50"
                y1="50"
                x2="50"
                y2="12"
                transform={`rotate(${secondDeg} 50 50)`}
                stroke="#ff4444"
                strokeWidth="1.5"
                strokeLinecap="round"
            />

            {/* Center dot */}
            <circle cx="50" cy="50" r="2" fill="#333" />
        </svg>
    );
}
