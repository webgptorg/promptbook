import { FolderKanbanIcon } from 'lucide-react';
import type { AgentProjectInfo } from '../../utils/agentProjects/AgentProjectInfo';
import { AgentProjectCard } from './AgentProjectCard';

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

    /**
     * Whether admin-only details (like absolute folder paths on the server disk) are shown.
     */
    readonly isAdminView: boolean;
};

/**
 * Renders all projects of one agent as cards.
 *
 * The board is shared by the per-agent Projects dashboard and the admin all-projects dashboard.
 *
 * @private component of Agent Projects dashboards
 */
export function AgentProjectsBoard({ agentPermanentId, projects, isAdminView }: AgentProjectsBoardProps) {
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
        <div className="space-y-4">
            {projects.map((project) => (
                <AgentProjectCard
                    key={project.projectName}
                    agentPermanentId={agentPermanentId}
                    project={project}
                    isAdminView={isAdminView}
                />
            ))}
        </div>
    );
}
