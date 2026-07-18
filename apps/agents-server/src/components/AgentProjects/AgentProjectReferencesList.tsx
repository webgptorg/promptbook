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
                    project={project}
                    variant="small"
                    className={itemClassName}
                />
            ))}
        </div>
    );
}
