'use client';

import { SVGProps } from 'react';

export function MenuIcon(props: SVGProps<SVGSVGElement> & { size?: number }) {
    const { size, ...rest } = props;
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size || 24}
            height={size || 24}
            viewBox="0 0 24 24"
            fill="currentColor"
            {...rest}
        >
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
        </svg>
    );
}
