import { AgentProjectItem, type AgentProjectItemInfo } from './AgentProjectItem';

export type { AgentProjectItemInfo } from './AgentProjectItem';

/**
 * Props for a compact list of project reference chips.
 */
type AgentProjectReferencesListProps = {
    /**
     * Permanent id of the agent owning the projects.
     */
    readonly agentPermanentId: string;

    /**
     * Public domain of the server owning the projects, when known.
     */
    readonly serverDomain?: string | null;

    /**
     * Public domain serving the current page, when known.
     */
    readonly currentServerDomain?: string | null;

    /**
     * Display-only project references.
     */
    readonly projects: ReadonlyArray<AgentProjectItemInfo>;

    /**
     * Optional CSS class for the list wrapper.
     */
    readonly className?: string;

    /**
     * Optional CSS class for each project item.
     */
    readonly itemClassName?: string;
};

/**
 * Renders compact project references reused by chat, profile, and admin surfaces.
 *
 * @param props - Project reference list props.
 * @returns Compact project reference list or `null` when empty.
 */
export function AgentProjectReferencesList({
    agentPermanentId,
    serverDomain = null,
    currentServerDomain = null,
    projects,
    className = '',
    itemClassName = '',
}: AgentProjectReferencesListProps) {
    if (projects.length === 0) {
        return null;
    }

    return (
        <div className={`flex flex-wrap gap-2 ${className}`} aria-label="Projects">
            {projects.map((project) => (
                <AgentProjectItem
                    key={project.projectName}
                    agentPermanentId={agentPermanentId}
                    serverDomain={serverDomain}
                    currentServerDomain={currentServerDomain}
                    project={project}
                    variant="small"
                    className={itemClassName}
                />
            ))}
        </div>
    );
}
