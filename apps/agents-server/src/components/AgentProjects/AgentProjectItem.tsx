import Link from 'next/link';
import type { ReactNode } from 'react';
import type { AgentProjectReferenceInfo } from '../../utils/agentProjects/AgentProjectReferenceInfo';
import { buildAgentProjectProfileHrefForServer } from '../../utils/agentProjects/agentProjectHrefs';
import { formatResourceBytes } from '../../utils/resourceMonitor/formatResourceMonitorValue';
import { AgentProjectIcon } from './AgentProjectIcon';

/**
 * Visual variants supported by project references.
 */
export type AgentProjectItemVariant = 'full' | 'small';

/**
 * Display-only project fields required by `<AgentProjectItem/>`.
 */
export type AgentProjectItemInfo = AgentProjectReferenceInfo;

/**
 * Props for one shared project reference item.
 */
type AgentProjectItemProps = {
    /**
     * Permanent id of the agent owning the project.
     */
    readonly agentPermanentId: string;

    /**
     * Public domain of the server owning the project, when known.
     */
    readonly serverDomain?: string | null;

    /**
     * Public domain serving the current page, when known.
     */
    readonly currentServerDomain?: string | null;

    /**
     * Displayed project metadata.
     */
    readonly project: AgentProjectItemInfo;

    /**
     * Visual item variant.
     */
    readonly variant?: AgentProjectItemVariant;

    /**
     * Optional CSS class overrides.
     */
    readonly className?: string;

    /**
     * Optional controls rendered below the full project card.
     */
    readonly footer?: ReactNode;
};

/**
 * Renders a shared project reference in either list-card or compact-chip form.
 *
 * @param props - Project item props.
 * @returns Project link item.
 */
export function AgentProjectItem({
    agentPermanentId,
    serverDomain = null,
    currentServerDomain = null,
    project,
    variant = 'full',
    className = '',
    footer,
}: AgentProjectItemProps) {
    const href = buildAgentProjectProfileHrefForServer({
        agentPermanentId,
        projectName: project.projectName,
        serverDomain,
        currentServerDomain,
    });
    const icon = (
        <AgentProjectIcon
            agentPermanentId={agentPermanentId}
            project={project}
            serverDomain={serverDomain}
            currentServerDomain={currentServerDomain}
            size={variant === 'small' ? 'small' : 'card'}
            className={variant === 'small' ? 'mt-0.5' : ''}
        />
    );

    if (variant === 'small') {
        return <SmallAgentProjectItem href={href} project={project} icon={icon} className={className} />;
    }

    return <FullAgentProjectItem href={href} project={project} icon={icon} className={className} footer={footer} />;
}

/**
 * Props shared by concrete project item variants.
 */
type AgentProjectItemVariantProps = {
    /**
     * Target project profile href.
     */
    readonly href: string;

    /**
     * Displayed project metadata.
     */
    readonly project: AgentProjectItemInfo;

    /**
     * Rendered project icon.
     */
    readonly icon: ReactNode;

    /**
     * Optional CSS class overrides.
     */
    readonly className: string;

    /**
     * Optional controls rendered below the full project card.
     */
    readonly footer?: ReactNode;
};

/**
 * Renders the full project card used by project grids.
 *
 * @param props - Project item variant props.
 * @returns Full project link card.
 */
function FullAgentProjectItem({ href, project, icon, className, footer }: AgentProjectItemVariantProps) {
    const isFooterVisible = footer !== undefined && footer !== null;
    const projectContent = (
        <>
            <div className="flex items-start gap-3">
                {icon}
                <div className="min-w-0 flex-1">
                    <h3
                        className="line-clamp-2 text-base font-semibold text-gray-950 group-hover:text-blue-700"
                        title={project.displayName}
                    >
                        {project.displayName}
                    </h3>
                    {project.displayName !== project.projectName && (
                        <p className="mt-0.5 truncate font-mono text-xs text-gray-400">{project.projectName}</p>
                    )}
                </div>
                <span className="shrink-0 rounded-md bg-gray-100 px-2 py-1 font-mono text-xs text-gray-600">
                    {formatResourceBytes(project.sizeBytes)}
                </span>
            </div>
            {project.description && (
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-600">{project.description}</p>
            )}
        </>
    );

    if (!isFooterVisible) {
        return (
            <Link
                href={href}
                className={`group flex h-full min-h-36 flex-col rounded-lg border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md ${className}`}
            >
                {projectContent}
            </Link>
        );
    }

    return (
        <div
            className={`group flex h-full min-h-36 flex-col rounded-lg border border-gray-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md ${className}`}
        >
            <Link href={href} className="flex flex-1 flex-col p-4">
                {projectContent}
            </Link>
            <div className="border-t border-gray-100 px-4 py-3">{footer}</div>
        </div>
    );
}

/**
 * Renders the compact project reference used in dense views.
 *
 * @param props - Project item variant props.
 * @returns Compact project link item.
 */
function SmallAgentProjectItem({ href, project, icon, className }: AgentProjectItemVariantProps) {
    return (
        <Link
            href={href}
            title={project.description || project.displayName}
            className={`inline-flex max-w-full items-start gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50/50 ${className}`}
        >
            {icon}
            <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-gray-900">{project.displayName}</span>
                {project.description && (
                    <span className="mt-0.5 block truncate text-xs text-gray-500">{project.description}</span>
                )}
            </span>
            <span className="shrink-0 font-mono text-xs text-gray-500">{formatResourceBytes(project.sizeBytes)}</span>
        </Link>
    );
}
