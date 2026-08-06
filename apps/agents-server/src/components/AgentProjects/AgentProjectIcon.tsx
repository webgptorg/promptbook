'use client';

import { useEffect, useState } from 'react';
import { createAgentProjectInitials } from '../../utils/agentProjects/createAgentProjectInitials';

/**
 * Visual sizes supported by a project icon.
 */
type AgentProjectIconSize = 'full' | 'small';

/**
 * Props for one project favicon or initials fallback.
 */
type AgentProjectIconProps = {
    /**
     * Project directory name used to derive fallback initials.
     */
    readonly projectName: string;

    /**
     * Served local favicon URL, or null when the project has no favicon.
     */
    readonly faviconHref: string | null;

    /**
     * Card density that determines the icon dimensions.
     */
    readonly size: AgentProjectIconSize;
};

/**
 * Size-specific container classes for project icons.
 */
const PROJECT_ICON_CLASS_NAME_BY_SIZE: Record<AgentProjectIconSize, string> = {
    full: 'h-11 w-11 rounded-lg',
    small: 'mt-0.5 h-5 w-5 rounded-md',
};

/**
 * Size-specific initials classes for project icons.
 */
const PROJECT_ICON_INITIALS_CLASS_NAME_BY_SIZE: Record<AgentProjectIconSize, string> = {
    full: 'text-xs',
    small: 'text-[7px]',
};

/**
 * Renders a project favicon when it can load, otherwise a deterministic initials icon.
 *
 * @param props - Project icon props.
 * @returns Project visual identifier.
 */
export function AgentProjectIcon({ projectName, faviconHref, size }: AgentProjectIconProps) {
    const [isFaviconFailed, setIsFaviconFailed] = useState(false);
    const isFaviconVisible = Boolean(faviconHref) && !isFaviconFailed;

    useEffect(() => {
        setIsFaviconFailed(false);
    }, [faviconHref]);

    return (
        <span
            className={[
                'flex shrink-0 items-center justify-center overflow-hidden border border-blue-100 bg-blue-50 text-blue-700',
                PROJECT_ICON_CLASS_NAME_BY_SIZE[size],
            ].join(' ')}
            aria-hidden
        >
            {isFaviconVisible ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={faviconHref!}
                    alt=""
                    className="h-full w-full object-contain p-1"
                    onError={() => setIsFaviconFailed(true)}
                />
            ) : (
                <span className={['font-bold leading-none', PROJECT_ICON_INITIALS_CLASS_NAME_BY_SIZE[size]].join(' ')}>
                    {createAgentProjectInitials(projectName)}
                </span>
            )}
        </span>
    );
}
