'use client';

import { SVGProps } from 'react';

export function DownloadIcon(props: SVGProps<SVGSVGElement> & { size?: number }) {
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
            <path d="M5 20h14v-2H5v2zm14-9h-4V3H9v8H5l7 7 7-7z" />
        </svg>
    );
}
