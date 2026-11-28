import {
    BotIcon,
    ExternalLinkIcon,
    FilesIcon,
    FolderKanbanIcon,
    Globe2Icon,
    HardDriveIcon,
    PlayIcon,
    SaveIcon,
    SquareIcon,
    type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { AgentProjectDnsWarning } from '../../../components/AgentProjects/AgentProjectDnsWarning';
import { AgentProjectRuntimeStatusBadge } from '../../../components/AgentProjects/AgentProjectRuntimeStatusBadge';
import { AgentProjectsBoard } from '../../../components/AgentProjects/AgentProjectsBoard';
import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import { isAgentsServerSqliteMode } from '../../../database/agentsServerDatabaseMode';
import type { AgentProjectInfo } from '../../../utils/agentProjects/AgentProjectInfo';
import type { AgentProjectsSummary } from '../../../utils/agentProjects/AgentProjectInfo';
import type { AgentProjectRuntimeInfo } from '../../../utils/agentProjects/AgentProjectRuntimeInfo';
import {
    buildAgentProjectProfileHref,
    buildAgentProjectsDashboardHref,
} from '../../../utils/agentProjects/agentProjectHrefs';
import {
    createAgentProjectRuntimeDomain,
    listAgentProjectDomainRecords,
    resolveAgentProjectRuntimeBaseDomain,
    type AgentProjectDomainRecord,
} from '../../../utils/agentProjects/agentProjectRuntimeDomains';
import {
    createAgentProjectDnsDiagnosticLookup,
    isAgentProjectDnsDiagnosticIssue,
    listAgentProjectDnsDiagnostics,
    type AgentProjectDnsDiagnostic,
} from '../../../utils/agentProjects/listAgentProjectDnsDiagnostics';
import { formatAgentProjectRuntimeStatus } from '../../../utils/agentProjects/agentProjectRuntimeDisplay';
import { listAgentProjectRuntimes } from '../../../utils/agentProjects/agentProjectRuntimeRegistry';
import { resolveCurrentAgentProjectServerDomain } from '../../../utils/agentProjects/resolveCurrentAgentProjectServerDomain';
import { listAllAgentProjectSummaries } from '../../../utils/agentProjects/listAllAgentProjectSummaries';
import { isUserAdmin } from '../../../utils/isUserAdmin';
import { formatResourceBytes } from '../../../utils/resourceMonitor/formatResourceMonitorValue';
import {
    $setAgentProjectCustomDomainFromAdminProjectsAction,
    $startAgentProjectRuntimeFromAdminProjectsAction,
    $terminateAgentProjectRuntimeFromAdminProjectsAction,
} from './actions';
import { AGENT_PROJECT_CUSTOM_DOMAIN_FORM_FIELD } from './agentProjectCustomDomainForm';

/**
 * Separator used in project-domain lookup keys.
 */
const PROJECT_DOMAIN_LOOKUP_KEY_SEPARATOR = '::';

/**
 * Project-domain records keyed by owner and project.
 */
type AgentProjectDomainLookup = ReadonlyMap<string, AgentProjectDomainRecord>;

/**
 * Project runtimes keyed by owner and project.
 */
type AgentProjectRuntimeLookup = ReadonlyMap<string, AgentProjectRuntimeInfo>;

/**
 * Project DNS diagnostics keyed by owner and project.
 */
type AgentProjectDnsDiagnosticLookup = ReadonlyMap<string, AgentProjectDnsDiagnostic>;

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

    const [report, currentServerDomain, projectDomainRecords, projectRuntimes] = await Promise.all([
        listAllAgentProjectSummaries({ scope: 'current-server' }),
        resolveCurrentAgentProjectServerDomain(),
        listAgentProjectDomainRecords(),
        listAgentProjectRuntimes(),
    ]);
    const serverDomain = resolveAgentProjectRuntimeBaseDomain(currentServerDomain);
    const projectDomainLookup = createAgentProjectDomainLookup(projectDomainRecords, serverDomain);
    const projectRuntimeLookup = createAgentProjectRuntimeLookup(projectRuntimes);
    const projectDnsDiagnosticLookup = createAgentProjectDnsDiagnosticLookup(
        isAgentsServerSqliteMode()
            ? await listAgentProjectDnsDiagnostics({
                  projectDomainRecords,
                  publicIpAddress: process.env.PTBK_PUBLIC_IP_ADDRESS,
                  serverDomain,
              })
            : [],
    );

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
                    value={`${report.summaries.length.toLocaleString()} of ${report.totalAgentCount.toLocaleString()}`}
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
                report.summaries.map((summary) => (
                    <AdminAgentProjectsSection
                        key={summary.agentDirectoryName}
                        projectDnsDiagnosticLookup={projectDnsDiagnosticLookup}
                        projectDomainLookup={projectDomainLookup}
                        projectRuntimeLookup={projectRuntimeLookup}
                        serverDomain={serverDomain}
                        summary={summary}
                    />
                ))
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
function AdminAgentProjectsSection({
    projectDnsDiagnosticLookup,
    projectDomainLookup,
    projectRuntimeLookup,
    serverDomain,
    summary,
}: {
    readonly projectDnsDiagnosticLookup: AgentProjectDnsDiagnosticLookup;
    readonly projectDomainLookup: AgentProjectDomainLookup;
    readonly projectRuntimeLookup: AgentProjectRuntimeLookup;
    readonly serverDomain: string | null;
    readonly summary: AgentProjectsSummary;
}) {
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
                renderProjectFooter={(project) => (
                    <AdminProjectRuntimeControls
                        agentPermanentId={summary.agentPermanentId}
                        projectName={project.projectName}
                        runtime={
                            projectRuntimeLookup.get(
                                createAgentProjectLookupKey(summary.agentPermanentId, project.projectName),
                            ) ?? null
                        }
                    />
                )}
            />
            <AdminProjectDomainsTable
                agentPermanentId={summary.agentPermanentId}
                projectDnsDiagnosticLookup={projectDnsDiagnosticLookup}
                projectDomainLookup={projectDomainLookup}
                projects={summary.projects}
                serverDomain={serverDomain}
            />
        </section>
    );
}

/**
 * Renders run and stop controls for one project card in the admin dashboard.
 */
function AdminProjectRuntimeControls({
    agentPermanentId,
    projectName,
    runtime,
}: {
    /**
     * Permanent id of the agent owning the project.
     */
    readonly agentPermanentId: string;

    /**
     * Directory name of the project.
     */
    readonly projectName: string;

    /**
     * Current project runtime, when one has been assigned.
     */
    readonly runtime: AgentProjectRuntimeInfo | null;
}) {
    if (runtime?.isRunning) {
        return (
            <div className="flex flex-wrap items-center justify-between gap-2">
                <AgentProjectRuntimeStatusBadge isRunning={runtime.isRunning}>
                    {formatAgentProjectRuntimeStatus(runtime)}
                </AgentProjectRuntimeStatusBadge>
                <form
                    action={$terminateAgentProjectRuntimeFromAdminProjectsAction.bind(
                        null,
                        agentPermanentId,
                        projectName,
                    )}
                >
                    <button
                        type="submit"
                        className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-100"
                    >
                        <SquareIcon className="h-4 w-4" aria-hidden />
                        Stop
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div className="flex flex-wrap items-center justify-between gap-2">
            {runtime && (
                <AgentProjectRuntimeStatusBadge isRunning={runtime.isRunning}>
                    {formatAgentProjectRuntimeStatus(runtime)}
                </AgentProjectRuntimeStatusBadge>
            )}
            <form action={$startAgentProjectRuntimeFromAdminProjectsAction.bind(null, agentPermanentId, projectName)}>
                <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                >
                    <PlayIcon className="h-4 w-4" aria-hidden />
                    Run
                </button>
            </form>
        </div>
    );
}

/**
 * Renders custom-domain assignment controls for all projects of one agent.
 */
function AdminProjectDomainsTable({
    agentPermanentId,
    projectDnsDiagnosticLookup,
    projectDomainLookup,
    projects,
    serverDomain,
}: {
    readonly agentPermanentId: string;
    readonly projectDnsDiagnosticLookup: AgentProjectDnsDiagnosticLookup;
    readonly projectDomainLookup: AgentProjectDomainLookup;
    readonly projects: ReadonlyArray<AgentProjectInfo>;
    readonly serverDomain: string | null;
}) {
    return (
        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3">
                <Globe2Icon className="h-4 w-4 text-gray-500" aria-hidden />
                <h3 className="text-sm font-semibold text-gray-900">Project domains</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                    <thead className="bg-white text-xs uppercase tracking-wide text-gray-500">
                        <tr>
                            <th className="px-4 py-3 text-left font-semibold">Project</th>
                            <th className="px-4 py-3 text-left font-semibold">Current domain</th>
                            <th className="px-4 py-3 text-left font-semibold">Custom domain</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {projects.map((project) => (
                            <AdminProjectDomainsTableRow
                                key={project.projectName}
                                agentPermanentId={agentPermanentId}
                                projectDnsDiagnosticLookup={projectDnsDiagnosticLookup}
                                project={project}
                                projectDomainLookup={projectDomainLookup}
                                serverDomain={serverDomain}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

/**
 * Renders one project-domain assignment row.
 */
function AdminProjectDomainsTableRow({
    agentPermanentId,
    projectDnsDiagnosticLookup,
    project,
    projectDomainLookup,
    serverDomain,
}: {
    readonly agentPermanentId: string;
    readonly projectDnsDiagnosticLookup: AgentProjectDnsDiagnosticLookup;
    readonly project: AgentProjectInfo;
    readonly projectDomainLookup: AgentProjectDomainLookup;
    readonly serverDomain: string | null;
}) {
    const projectDomainRecord =
        projectDomainLookup.get(createAgentProjectLookupKey(agentPermanentId, project.projectName)) ?? null;
    const projectDnsDiagnostic =
        projectDnsDiagnosticLookup.get(createAgentProjectLookupKey(agentPermanentId, project.projectName)) ?? null;
    const generatedDomain = serverDomain
        ? createAgentProjectRuntimeDomain({
              projectName: project.projectName,
              serverDomain,
          })
        : null;
    const currentDomain = projectDomainRecord?.domain ?? generatedDomain;

    return (
        <tr>
            <td className="px-4 py-3 align-top">
                <Link
                    href={buildAgentProjectProfileHref(agentPermanentId, project.projectName)}
                    className="font-semibold text-gray-900 hover:text-blue-700 hover:underline"
                >
                    {project.displayName}
                </Link>
                {project.displayName !== project.projectName && (
                    <p className="mt-0.5 font-mono text-xs text-gray-400">{project.projectName}</p>
                )}
            </td>
            <td className="px-4 py-3 align-top">
                {projectDomainRecord ? (
                    <a
                        href={projectDomainRecord.publicUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-blue-700 hover:text-blue-900 hover:underline"
                    >
                        {projectDomainRecord.domain}
                        <ExternalLinkIcon className="h-3.5 w-3.5" aria-hidden />
                    </a>
                ) : currentDomain ? (
                    <span className="font-mono text-gray-500">{currentDomain}</span>
                ) : (
                    <span className="text-gray-400">No public server domain</span>
                )}
                {projectDomainRecord?.customDomain ? (
                    <span className="ml-2 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        Custom
                    </span>
                ) : null}
                {projectDnsDiagnostic && isAgentProjectDnsDiagnosticIssue(projectDnsDiagnostic) ? (
                    <AgentProjectDnsWarning projectDomain={projectDnsDiagnostic.projectDomain} />
                ) : null}
            </td>
            <td className="px-4 py-3 align-top">
                <form
                    action={$setAgentProjectCustomDomainFromAdminProjectsAction.bind(
                        null,
                        agentPermanentId,
                        project.projectName,
                    )}
                    className="flex min-w-[18rem] max-w-xl gap-2"
                >
                    <input
                        name={AGENT_PROJECT_CUSTOM_DOMAIN_FORM_FIELD}
                        type="text"
                        defaultValue={projectDomainRecord?.customDomain || ''}
                        placeholder={generatedDomain || 'project.example.com'}
                        disabled={!serverDomain}
                        className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 font-mono text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50 disabled:text-gray-400"
                    />
                    <button
                        type="submit"
                        disabled={!serverDomain}
                        className="inline-flex shrink-0 items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <SaveIcon className="h-4 w-4" aria-hidden />
                        Save
                    </button>
                </form>
            </td>
        </tr>
    );
}

/**
 * Creates a lookup of project-domain records scoped to the current server domain.
 */
function createAgentProjectDomainLookup(
    projectDomainRecords: ReadonlyArray<AgentProjectDomainRecord>,
    serverDomain: string | null,
): AgentProjectDomainLookup {
    const projectDomainLookup = new Map<string, AgentProjectDomainRecord>();

    if (!serverDomain) {
        return projectDomainLookup;
    }

    for (const projectDomainRecord of projectDomainRecords) {
        if (resolveAgentProjectRuntimeBaseDomain(projectDomainRecord.serverDomain) !== serverDomain) {
            continue;
        }

        projectDomainLookup.set(
            createAgentProjectLookupKey(projectDomainRecord.agentPermanentId, projectDomainRecord.projectName),
            projectDomainRecord,
        );
    }

    return projectDomainLookup;
}

/**
 * Creates a lookup of project runtimes keyed by owner and project.
 */
function createAgentProjectRuntimeLookup(
    projectRuntimes: ReadonlyArray<AgentProjectRuntimeInfo>,
): AgentProjectRuntimeLookup {
    return new Map(
        projectRuntimes.map((projectRuntime) => [
            createAgentProjectLookupKey(projectRuntime.agentPermanentId, projectRuntime.projectName),
            projectRuntime,
        ]),
    );
}

/**
 * Creates a stable lookup key for one agent project.
 */
function createAgentProjectLookupKey(agentPermanentId: string, projectName: string): string {
    return [agentPermanentId.toLowerCase(), projectName.toLowerCase()].join(PROJECT_DOMAIN_LOOKUP_KEY_SEPARATOR);
}
