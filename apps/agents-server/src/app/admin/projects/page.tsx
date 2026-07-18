import { BotIcon, FilesIcon, FolderKanbanIcon, HardDriveIcon, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { AgentProjectsBoard } from '../../../components/AgentProjects/AgentProjectsBoard';
import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import type { AgentProjectsSummary } from '../../../utils/agentProjects/AgentProjectInfo';
import { buildAgentProjectsDashboardHref } from '../../../utils/agentProjects/agentProjectHrefs';
import { listAllAgentProjectSummaries } from '../../../utils/agentProjects/listAllAgentProjectSummaries';
import { isUserAdmin } from '../../../utils/isUserAdmin';
import { formatResourceBytes } from '../../../utils/resourceMonitor/formatResourceMonitorValue';

/**
 * Forces fresh project listings from disk on every request.
 */
export const dynamic = 'force-dynamic';

/**
 * Admin dashboard listing all projects of all agents with their folders.
 */
export default async function AdminAgentProjectsPage() {
    if (!(await isUserAdmin())) {
        return <ForbiddenPage />;
    }

    const report = await listAllAgentProjectSummaries();

    return (
        <div className="container mx-auto space-y-6 px-4 py-8">
            <div className="mt-20">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">Admin</p>
                <h1 className="mt-1 flex items-center gap-2 text-3xl font-light text-gray-900">
                    <FolderKanbanIcon className="h-7 w-7 text-gray-400" aria-hidden />
                    Agent projects
                </h1>
                <p className="mt-1 max-w-3xl text-sm text-gray-500">
                    All projects of all agents on this server. Every project is one folder the owning agent fully
                    controls. Projects live under <code className="text-gray-600">{report.rootPath}</code>.
                </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <AdminProjectsMetricCard
                    icon={HardDriveIcon}
                    label="Total size"
                    value={formatResourceBytes(report.totalSizeBytes)}
                />
                <AdminProjectsMetricCard
                    icon={FolderKanbanIcon}
                    label="Projects"
                    value={report.totalProjectCount.toLocaleString()}
                />
                <AdminProjectsMetricCard
                    icon={BotIcon}
                    label="Agents with projects"
                    value={`${report.summaries.length.toLocaleString()} of ${report.scannedAgentDirectoryCount.toLocaleString()}`}
                />
                <AdminProjectsMetricCard
                    icon={FilesIcon}
                    label="Files"
                    value={report.totalFileCount.toLocaleString()}
                />
            </div>
            {report.summaries.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center text-sm text-gray-500">
                    No agent has created a project yet.
                </div>
            ) : (
                report.summaries.map((summary) => <AdminAgentProjectsSection key={summary.agentDirectoryName} summary={summary} />)
            )}
        </div>
    );
}

/**
 * Renders one aggregate metric card of the admin projects dashboard.
 */
function AdminProjectsMetricCard({
    icon: Icon,
    label,
    value,
}: {
    readonly icon: LucideIcon;
    readonly label: string;
    readonly value: string;
}) {
    return (
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>
                <Icon className="h-5 w-5 shrink-0 text-gray-400" aria-hidden />
            </div>
            <div className="mt-2 text-3xl font-light text-gray-950">{value}</div>
        </section>
    );
}

/**
 * Renders projects of one agent inside the admin dashboard.
 */
function AdminAgentProjectsSection({ summary }: { readonly summary: AgentProjectsSummary }) {
    return (
        <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-2">
                <div className="flex items-center gap-2">
                    <BotIcon className="h-5 w-5 text-gray-400" aria-hidden />
                    <Link
                        href={buildAgentProjectsDashboardHref(summary.agentPermanentId)}
                        className="text-lg font-semibold text-gray-900 hover:text-blue-700 hover:underline"
                    >
                        {summary.agentName || `Unknown agent (${summary.agentDirectoryName})`}
                    </Link>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                    <span>
                        {summary.projects.length} {summary.projects.length === 1 ? 'project' : 'projects'}
                    </span>
                    <span className="font-mono text-gray-700">{formatResourceBytes(summary.totalSizeBytes)}</span>
                </div>
            </div>
            <AgentProjectsBoard
                agentPermanentId={summary.agentPermanentId}
                projects={summary.projects}
                isAdminView
                isProjectDetailsVisible
            />
        </section>
    );
}
