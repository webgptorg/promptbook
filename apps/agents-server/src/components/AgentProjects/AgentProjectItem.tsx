import { FolderKanbanIcon } from 'lucide-react';
import Link from 'next/link';
import type { AgentProjectInfo } from '../../utils/agentProjects/AgentProjectInfo';
import { buildAgentProjectProfileHref } from '../../utils/agentProjects/agentProjectHrefs';
import { formatResourceBytes } from '../../utils/resourceMonitor/formatResourceMonitorValue';

/**
 * Visual variants supported by project references.
 */
export type AgentProjectItemVariant = 'full' | 'small';

/**
 * Display-only project fields required by `<AgentProjectItem/>`.
 */
export type AgentProjectItemInfo = Pick<
    AgentProjectInfo,
    'projectName' | 'displayName' | 'description' | 'sizeBytes'
>;

/**
 * Props for one shared project reference item.
 */
type AgentProjectItemProps = {
    /**
     * Permanent id of the agent owning the project.
     */
    readonly agentPermanentId: string;

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
};

/**
 * Renders a shared project reference in either list-card or compact-chip form.
 *
 * @param props - Project item props.
 * @returns Project link item.
 */
export function AgentProjectItem({
    agentPermanentId,
    project,
    variant = 'full',
    className = '',
}: AgentProjectItemProps) {
    const href = buildAgentProjectProfileHref(agentPermanentId, project.projectName);

    if (variant === 'small') {
        return <SmallAgentProjectItem href={href} project={project} className={className} />;
    }

    return <FullAgentProjectItem href={href} project={project} className={className} />;
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
     * Optional CSS class overrides.
     */
    readonly className: string;
};

/**
 * Renders the full project card used by project grids.
 *
 * @param props - Project item variant props.
 * @returns Full project link card.
 */
function FullAgentProjectItem({ href, project, className }: AgentProjectItemVariantProps) {
    return (
        <Link
            href={href}
            className={`group flex h-full min-h-36 flex-col rounded-lg border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md ${className}`}
        >
            <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-700">
                    <FolderKanbanIcon className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-semibold text-gray-950 group-hover:text-blue-700">
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
        </Link>
    );
}

/**
 * Renders the compact project reference used in dense views.
 *
 * @param props - Project item variant props.
 * @returns Compact project link item.
 */
function SmallAgentProjectItem({ href, project, className }: AgentProjectItemVariantProps) {
    return (
        <Link
            href={href}
            title={project.description || project.displayName}
            className={`inline-flex max-w-full items-start gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50/50 ${className}`}
        >
            <FolderKanbanIcon className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden />
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
