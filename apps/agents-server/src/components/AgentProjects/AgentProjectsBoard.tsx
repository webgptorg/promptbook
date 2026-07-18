import { FolderKanbanIcon } from 'lucide-react';
import type { AgentProjectInfo } from '../../utils/agentProjects/AgentProjectInfo';
import { AgentProjectItem } from './AgentProjectItem';

/**
 * Props of the shared agent projects board.
 *
 * @private component of Agent Projects dashboards
 */
type AgentProjectsBoardProps = {
    /**
     * Permanent id of the agent owning the projects.
     */
    readonly agentPermanentId: string;

    /**
     * Projects rendered on the board.
     */
    readonly projects: ReadonlyArray<AgentProjectInfo>;
};

/**
 * Renders all projects of one agent as cards.
 *
 * The board is shared by the per-agent Projects dashboard and the admin all-projects dashboard.
 *
 * @private component of Agent Projects dashboards
 */
export function AgentProjectsBoard({
    agentPermanentId,
    projects,
}: AgentProjectsBoardProps) {
    if (projects.length === 0) {
        return (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center">
                <FolderKanbanIcon className="mx-auto h-8 w-8 text-gray-300" aria-hidden />
                <p className="mt-3 text-sm font-semibold text-gray-700">No projects yet</p>
                <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
                    Ask the agent in chat to build something — for example a website or a script — and it will create
                    its first project here.
                </p>
            </div>
        );
    }

    return (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {projects.map((project) => (
                <AgentProjectItem
                    key={project.projectName}
                    agentPermanentId={agentPermanentId}
                    project={project}
                />
            ))}
        </div>
    );
}
