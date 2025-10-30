import { JSX } from 'react';

/**
 * Renders an icon that represents the fullscreen action
 *
 * @private
 */
export function FullscreenIcon(): JSX.Element {
    return (
        <svg
            width="1em"
            height="1em"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            <path
                d="M15 3h6v6m-2-8L7 13m8-2v6h-6m-2 8L17 9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
