'use client';

import { useEffect, useRef, useState } from 'react';
import type { AgentProjectReferenceInfo } from '../../utils/agentProjects/AgentProjectReferenceInfo';
import { buildAgentProjectFileHrefForServer } from '../../utils/agentProjects/agentProjectHrefs';
import { createAgentProjectInitials } from '../../utils/agentProjects/createAgentProjectInitials';

/**
 * Sizes at which one project icon is shown.
 */
export type AgentProjectIconSize = 'small' | 'card' | 'header';

/**
 * Project fields required to render the icon of one project.
 */
export type AgentProjectIconInfo = Pick<AgentProjectReferenceInfo, 'projectName' | 'faviconRelativePath'>;

/**
 * Classes of the icon container, of the favicon and of the initials per icon size.
 */
const AGENT_PROJECT_ICON_CLASS_NAMES_BY_SIZE: Record<
    AgentProjectIconSize,
    {
        /**
         * Classes of the icon container.
         */
        readonly container: string;

        /**
         * Classes of the rendered favicon.
         */
        readonly favicon: string;

        /**
         * Classes of the rendered initials.
         */
        readonly initials: string;
    }
> = {
    small: { container: 'h-5 w-5 rounded-md', favicon: 'p-0.5', initials: 'text-[0.5rem] tracking-tight' },
    card: { container: 'h-11 w-11 rounded-lg', favicon: 'p-1.5', initials: 'text-sm' },
    header: { container: 'h-9 w-9 rounded-lg', favicon: 'p-1', initials: 'text-xs' },
};

/**
 * Props for one project icon.
 */
type AgentProjectIconProps = {
    /**
     * Permanent id of the agent owning the project.
     */
    readonly agentPermanentId: string;

    /**
     * Project the icon belongs to.
     */
    readonly project: AgentProjectIconInfo;

    /**
     * Public domain of the server owning the project, when known.
     */
    readonly serverDomain?: string | null;

    /**
     * Public domain serving the current page, when known.
     */
    readonly currentServerDomain?: string | null;

    /**
     * Size at which the icon is shown.
     */
    readonly size: AgentProjectIconSize;

    /**
     * Optional CSS class overrides.
     */
    readonly className?: string;
};

/**
 * Renders the visual identity of one project — its favicon, or its initials as the fallback.
 *
 * The favicon is served from the project folder, which requires a signed-in visitor, so the
 * initials are shown whenever the favicon is missing or cannot be loaded.
 *
 * @private component of Agent Projects dashboards
 */
export function AgentProjectIcon({
    agentPermanentId,
    project,
    serverDomain = null,
    currentServerDomain = null,
    size,
    className = '',
}: AgentProjectIconProps) {
    const [isFaviconBroken, setIsFaviconBroken] = useState(false);
    const faviconImageRef = useRef<HTMLImageElement | null>(null);
    const iconClassNames = AGENT_PROJECT_ICON_CLASS_NAMES_BY_SIZE[size];
    const faviconHref = !project.faviconRelativePath
        ? null
        : buildAgentProjectFileHrefForServer({
              agentPermanentId,
              projectName: project.projectName,
              fileRelativePath: project.faviconRelativePath,
              serverDomain,
              currentServerDomain,
          });

    useEffect(() => {
        // Note: A favicon rendered on the server can already fail before this component is hydrated,
        //       which loses its `error` event — an image which finished loading with no pixels is broken.
        const faviconImage = faviconImageRef.current;
        setIsFaviconBroken(faviconImage?.complete === true && faviconImage.naturalWidth === 0);
    }, [faviconHref]);

    return (
        <span
            className={`flex shrink-0 items-center justify-center overflow-hidden border border-blue-100 bg-blue-50 text-blue-700 ${iconClassNames.container} ${className}`}
            aria-hidden
        >
            {faviconHref !== null && !isFaviconBroken ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    ref={faviconImageRef}
                    src={faviconHref}
                    alt=""
                    className={`h-full w-full object-contain ${iconClassNames.favicon}`}
                    onError={() => setIsFaviconBroken(true)}
                />
            ) : (
                <span className={`font-bold leading-none ${iconClassNames.initials}`}>
                    {createAgentProjectInitials(project.projectName)}
                </span>
            )}
        </span>
    );
}
