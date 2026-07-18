import { FolderKanbanIcon } from 'lucide-react';
import Link from 'next/link';
import { AgentProjectsBoard } from '@/src/components/AgentProjects/AgentProjectsBoard';
import { ForbiddenPage } from '@/src/components/ForbiddenPage/ForbiddenPage';
import { resolveAgentProjectsAccess } from '@/src/utils/agentProjects/agentProjectAccess';
import { ADMIN_AGENT_PROJECTS_DASHBOARD_HREF } from '@/src/utils/agentProjects/agentProjectHrefs';
import { listAgentProjects } from '@/src/utils/agentProjects/listAgentProjects';
import { formatResourceBytes } from '@/src/utils/resourceMonitor/formatResourceMonitorValue';
import { loadLocalAgentSourceSnapshot } from '@/src/utils/localChatRunner/ensureLocalAgentFolder';
import { enforceCanonicalLocalAgentId, getAgentName } from '../_utils';

/**
 * Forces fresh project listings from disk on every request.
 */
export const dynamic = 'force-dynamic';

/**
 * Builds canonical projects-dashboard path for one local agent id.
 */
function buildCanonicalAgentProjectsPath(canonicalAgentId: string): string {
    return `/agents/${encodeURIComponent(canonicalAgentId)}/projects`;
}

/**
 * Renders the Projects dashboard of one agent.
 *
 * The dashboard lists all projects the agent keeps in its local `projects/` folder —
 * isolated folders the agent fully controls and can reference in the chat.
 */
export default async function AgentProjectsPage({ params }: { params: Promise<{ agentName: string }> }) {
    const agentName = await getAgentName(params);
    const canonicalAgentId = await enforceCanonicalLocalAgentId(agentName, buildCanonicalAgentProjectsPath);

    const access = await resolveAgentProjectsAccess(canonicalAgentId);
    if (!access.isProjectOverviewVisible) {
        return <ForbiddenPage />;
    }

    const [projects, agentSnapshot] = await Promise.all([
        listAgentProjects(canonicalAgentId),
        loadLocalAgentSourceSnapshot(canonicalAgentId).catch(() => null),
    ]);
    const isAdmin = access.currentUser?.isAdmin === true;
    const totalSizeBytes = projects.reduce((accumulatedSizeBytes, project) => accumulatedSizeBytes + project.sizeBytes, 0);

    return (
        <div className="container mx-auto space-y-6 px-4 py-8">
            <div className="mt-20 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
                        {agentSnapshot?.agentName || canonicalAgentId}
                    </p>
                    <h1 className="mt-1 flex items-center gap-2 text-3xl font-light text-gray-900">
                        <FolderKanbanIcon className="h-7 w-7 text-gray-400" aria-hidden />
                        Projects
                    </h1>
                    {access.isProjectDetailsVisible ? (
                        <p className="mt-1 max-w-3xl text-sm text-gray-500">
                            Every project is one folder the agent fully controls — it can create and edit files there,
                            run scripts, keep a git repository, and link the files into the chat.
                        </p>
                    ) : (
                        <p className="mt-1 max-w-3xl text-sm text-gray-500">
                            Projects shared by this agent.
                        </p>
                    )}
                </div>
                {access.isProjectDetailsVisible && (
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span className="rounded-md border border-gray-200 bg-white px-3 py-1.5">
                            {projects.length} {projects.length === 1 ? 'project' : 'projects'},{' '}
                            <span className="font-mono text-gray-700">{formatResourceBytes(totalSizeBytes)}</span>
                        </span>
                        {isAdmin && (
                            <Link
                                href={ADMIN_AGENT_PROJECTS_DASHBOARD_HREF}
                                className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 font-semibold text-blue-700 hover:bg-blue-100"
                            >
                                All agents&apos; projects
                            </Link>
                        )}
                    </div>
                )}
            </div>
            <AgentProjectsBoard
                agentPermanentId={canonicalAgentId}
                projects={projects}
                isAdminView={isAdmin}
                isProjectDetailsVisible={access.isProjectDetailsVisible}
            />
        </div>
    );
}
