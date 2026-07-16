import { FolderGit2, FolderOpen, RefreshCcw } from 'lucide-react';
import Link from 'next/link';
import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import {
    groupAgentProjectSummariesByAgent,
    listAgentProjectSummaries,
    type AgentProjectSummary,
    type AgentProjectsByAgentSummary,
} from '../../../utils/agentProjects';
import { isUserAdmin } from '../../../utils/isUserAdmin';
import { formatResourceBytes } from '../../../utils/resourceMonitor/formatResourceMonitorValue';

/**
 * Forces fresh project size readings for every request.
 */
export const dynamic = 'force-dynamic';

/**
 * Admin page listing all agent projects and their server folders.
 */
export default async function AgentProjectsAdminPage() {
    if (!(await isUserAdmin())) {
        return <ForbiddenPage />;
    }

    const projects = await listAgentProjectSummaries();
    const agentSummaries = groupAgentProjectSummariesByAgent(projects);
    const totalSizeBytes = projects.reduce((sum, project) => sum + project.sizeBytes, 0);

    return (
        <div className="container mx-auto space-y-6 px-4 py-8">
            <ProjectsHeader projectCount={projects.length} totalSizeBytes={totalSizeBytes} />
            {projects.length === 0 ? (
                <EmptyProjectsState />
            ) : (
                <div className="space-y-6">
                    {agentSummaries.map((agentSummary) => (
                        <AgentProjectsSection key={agentSummary.agentPermanentId} agentSummary={agentSummary} />
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * Renders page heading and refresh action.
 */
function ProjectsHeader({
    projectCount,
    totalSizeBytes,
}: {
    readonly projectCount: number;
    readonly totalSizeBytes: number;
}) {
    return (
        <div className="mt-20 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">Administration</p>
                <h1 className="mt-1 text-3xl font-light text-gray-900">Agent projects</h1>
                <p className="mt-1 max-w-3xl text-sm text-gray-500">
                    Local project folders owned by agents on this Agents Server.
                </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <span className="rounded-md border border-gray-200 bg-white px-3 py-1.5">
                    {projectCount.toLocaleString()} projects, {formatResourceBytes(totalSizeBytes)}
                </span>
                <Link
                    href="/admin/projects"
                    className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 font-semibold text-blue-700 hover:bg-blue-100"
                >
                    <RefreshCcw className="h-3.5 w-3.5" />
                    Refresh
                </Link>
            </div>
        </div>
    );
}

/**
 * Renders an empty state when no agent has created a project yet.
 */
function EmptyProjectsState() {
    return (
        <section className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600 shadow-sm">
            No agent projects have been created yet.
        </section>
    );
}

/**
 * Renders projects grouped by one agent.
 */
function AgentProjectsSection({ agentSummary }: { readonly agentSummary: AgentProjectsByAgentSummary }) {
    return (
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                        {agentSummary.agentName || agentSummary.agentPermanentId}
                    </h2>
                    <p className="mt-1 font-mono text-xs text-gray-500">{agentSummary.agentPermanentId}</p>
                </div>
                <div className="text-sm text-gray-600">
                    {agentSummary.projectCount.toLocaleString()} projects,{' '}
                    {formatResourceBytes(agentSummary.totalSizeBytes)}
                </div>
            </div>
            <ProjectsTable projects={agentSummary.projects} />
        </section>
    );
}

/**
 * Renders a table of projects for one agent.
 */
function ProjectsTable({ projects }: { readonly projects: ReadonlyArray<AgentProjectSummary> }) {
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
                <thead>
                    <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-400">
                        <th className="py-2 pr-4 font-semibold">Project</th>
                        <th className="py-2 pr-4 font-semibold">Folder</th>
                        <th className="py-2 pr-4 font-semibold">Size</th>
                        <th className="py-2 pr-4 font-semibold">Files</th>
                        <th className="py-2 pr-4 font-semibold">Git</th>
                    </tr>
                </thead>
                <tbody>
                    {projects.map((project) => (
                        <tr
                            key={project.id}
                            id={`project-${project.id}`}
                            className="border-b border-gray-100 last:border-0"
                        >
                            <td className="py-3 pr-4 align-top">
                                <Link
                                    href={`/admin/projects/${project.id}`}
                                    className="flex items-center gap-2 font-medium text-blue-700 hover:underline"
                                >
                                    <FolderOpen className="h-4 w-4 text-gray-400" aria-hidden />
                                    {project.name}
                                </Link>
                                <div className="mt-1 text-xs text-gray-500">ID {project.id}</div>
                            </td>
                            <td className="max-w-[28rem] break-all py-3 pr-4 align-top font-mono text-xs text-gray-700">
                                {project.directoryPath}
                                {project.errorMessage ? (
                                    <div className="mt-1 font-sans text-xs text-amber-700">{project.errorMessage}</div>
                                ) : null}
                            </td>
                            <td className="py-3 pr-4 align-top text-gray-700">
                                {formatResourceBytes(project.sizeBytes)}
                            </td>
                            <td className="py-3 pr-4 align-top text-gray-700">
                                {project.fileCount.toLocaleString()} files, {project.directoryCount.toLocaleString()}{' '}
                                directories
                            </td>
                            <td className="py-3 pr-4 align-top text-gray-700">
                                {project.isGitRepository ? (
                                    <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                                        <FolderGit2 className="h-3.5 w-3.5" aria-hidden />
                                        Repository
                                    </span>
                                ) : (
                                    <span className="text-xs text-gray-400">No .git</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
