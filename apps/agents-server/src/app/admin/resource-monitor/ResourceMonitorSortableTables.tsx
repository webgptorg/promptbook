'use client';

import { AgentProjectReferencesList } from '@/src/components/AgentProjects/AgentProjectReferencesList';
import { AgentProjectRuntimeStatusBadge } from '@/src/components/AgentProjects/AgentProjectRuntimeStatusBadge';
import {
    formatAgentProjectRuntimeMode,
    formatAgentProjectRuntimeStatus,
} from '@/src/utils/agentProjects/agentProjectRuntimeDisplay';
import {
    ADMIN_AGENT_PROJECTS_DASHBOARD_HREF,
    buildAgentProjectsDashboardHref,
} from '@/src/utils/agentProjects/agentProjectHrefs';
import {
    formatResourceBytes,
    formatResourceRate,
} from '@/src/utils/resourceMonitor/formatResourceMonitorValue';
import type {
    AgentProjectsResourceAgentUsage,
    NetworkInterfaceResourceUsage,
    ServerResourceMonitorSnapshot,
} from '@/src/utils/resourceMonitor/resourceMonitorTypes';
import { ExternalLink, Square } from 'lucide-react';
import Link from 'next/link';
import { AdminSortableTableHeaderCell } from '../_components/AdminSortableTableHeaderCell';
import { useAdminTableSorting, type AdminTableSortOrder } from '../_components/adminTableSorting';
import { $terminateAgentProjectRuntimeFromResourceMonitorAction } from './actions';
import { formatResourceMonitorMeasuredAt } from './resourceMonitorDisplay';

/**
 * Upper bound of per-agent project rows shown directly in the resource monitor.
 *
 * @private internal constant of <AgentProjectsUsageTable/>
 */
const MAX_LISTED_PROJECT_AGENTS = 25;

/**
 * Sortable fields in the agent project usage table.
 *
 * @private internal type of <AgentProjectsUsageTable/>
 */
type AgentProjectsUsageTableSortField = 'agent' | 'projects' | 'sizeBytes';

/**
 * Sortable fields in the project runtime table.
 *
 * @private internal type of <AgentProjectRuntimesTable/>
 */
type AgentProjectRuntimesTableSortField = 'projectName' | 'port' | 'mode' | 'status' | 'startedAt' | 'command';

/**
 * Sortable fields in the network usage table.
 *
 * @private internal type of <NetworkUsageTable/>
 */
type NetworkUsageTableSortField =
    | 'name'
    | 'receivedBytes'
    | 'transmittedBytes'
    | 'receivedBytesPerSecond'
    | 'transmittedBytesPerSecond';

/**
 * Props shared by resource monitor table components.
 *
 * @private internal type of resource monitor table components.
 */
type ResourceMonitorTableProps = {
    readonly snapshot: ServerResourceMonitorSnapshot;
};

/**
 * Renders sortable per-agent project storage usage.
 *
 * @param props - Projects props.
 * @returns Projects table or fallback.
 * @private internal component of <ResourceMonitorPage/>
 */
export function AgentProjectsUsageTable({ snapshot }: ResourceMonitorTableProps) {
    const projectSorting = useAdminTableSorting<AgentProjectsResourceAgentUsage, AgentProjectsUsageTableSortField>({
        rows: snapshot.projects.agents,
        defaultSortBy: 'sizeBytes',
        defaultSortOrder: 'desc',
        resolveDefaultSortOrder: resolveAgentProjectsUsageDefaultSortOrder,
        resolveSortValue: resolveAgentProjectsUsageSortValue,
    });

    if (snapshot.projects.errorMessage) {
        return (
            <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                {snapshot.projects.errorMessage}
            </div>
        );
    }

    if (snapshot.projects.agents.length === 0) {
        return (
            <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                No agent has created a project yet. Projects live under{' '}
                <span className="font-mono">{snapshot.projects.rootPath}</span>.
            </div>
        );
    }

    const listedAgents = projectSorting.sortedRows.slice(0, MAX_LISTED_PROJECT_AGENTS);
    const omittedAgentCount = snapshot.projects.agents.length - listedAgents.length;

    return (
        <div className="space-y-3">
            <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-400">
                            <AdminSortableTableHeaderCell
                                className="py-2 pr-4 font-semibold"
                                label="agent"
                                sortBy="agent"
                                activeSortBy={projectSorting.sortBy}
                                sortOrder={projectSorting.sortOrder}
                                onSortChange={projectSorting.handleSortChange}
                            >
                                Agent
                            </AdminSortableTableHeaderCell>
                            <AdminSortableTableHeaderCell
                                className="py-2 pr-4 font-semibold"
                                label="projects"
                                sortBy="projects"
                                activeSortBy={projectSorting.sortBy}
                                sortOrder={projectSorting.sortOrder}
                                onSortChange={projectSorting.handleSortChange}
                            >
                                Projects
                            </AdminSortableTableHeaderCell>
                            <AdminSortableTableHeaderCell
                                className="py-2 pr-4 font-semibold"
                                label="total size"
                                sortBy="sizeBytes"
                                activeSortBy={projectSorting.sortBy}
                                sortOrder={projectSorting.sortOrder}
                                onSortChange={projectSorting.handleSortChange}
                            >
                                Total size
                            </AdminSortableTableHeaderCell>
                        </tr>
                    </thead>
                    <tbody>
                        {listedAgents.map((agentUsage) => (
                            <tr key={agentUsage.agentPermanentId} className="border-b border-gray-100 last:border-0">
                                <td className="py-2 pr-4">
                                    <Link
                                        href={buildAgentProjectsDashboardHref(agentUsage.agentPermanentId)}
                                        className="text-gray-900 hover:text-blue-700 hover:underline"
                                    >
                                        {agentUsage.agentName || agentUsage.agentPermanentId}
                                    </Link>
                                </td>
                                <td className="py-2 pr-4 text-gray-700">
                                    <AgentProjectReferencesList
                                        agentPermanentId={agentUsage.agentPermanentId}
                                        projects={agentUsage.projects}
                                        className="min-w-64 max-w-xl flex-col"
                                        itemClassName="w-full"
                                    />
                                </td>
                                <td className="py-2 pr-4 text-gray-700">{formatResourceBytes(agentUsage.sizeBytes)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="border-t border-gray-200 text-gray-900">
                            <td className="py-2 pr-4 font-semibold">All agents</td>
                            <td className="py-2 pr-4 font-semibold">{snapshot.projects.totalProjectCount}</td>
                            <td className="py-2 pr-4 font-semibold">
                                {formatResourceBytes(snapshot.projects.totalSizeBytes)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                <span>
                    {omittedAgentCount > 0 ? `...and ${omittedAgentCount} more agents. ` : ''}
                    Root: <span className="font-mono">{snapshot.projects.rootPath}</span>
                </span>
                <Link
                    href={ADMIN_AGENT_PROJECTS_DASHBOARD_HREF}
                    className="font-semibold text-blue-700 hover:text-blue-900 hover:underline"
                >
                    Open projects dashboard
                </Link>
            </div>
        </div>
    );
}

/**
 * Renders sortable assigned project runtime ports.
 *
 * @param props - Project runtime props.
 * @returns Runtime table or fallback.
 * @private internal component of <ResourceMonitorPage/>
 */
export function AgentProjectRuntimesTable({ snapshot }: ResourceMonitorTableProps) {
    const runtimeSorting = useAdminTableSorting<
        ServerResourceMonitorSnapshot['projectRuntimes']['runtimes'][number],
        AgentProjectRuntimesTableSortField
    >({
        rows: snapshot.projectRuntimes.runtimes,
        defaultSortBy: 'startedAt',
        defaultSortOrder: 'desc',
        resolveDefaultSortOrder: resolveAgentProjectRuntimesDefaultSortOrder,
        resolveSortValue: resolveAgentProjectRuntimesSortValue,
    });

    if (snapshot.projectRuntimes.errorMessage) {
        return (
            <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                {snapshot.projectRuntimes.errorMessage}
            </div>
        );
    }

    if (snapshot.projectRuntimes.runtimes.length === 0) {
        return (
            <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                No project runtime port is assigned.
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
                <thead>
                    <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-400">
                        <AdminSortableTableHeaderCell
                            className="py-2 pr-4 font-semibold"
                            label="project"
                            sortBy="projectName"
                            activeSortBy={runtimeSorting.sortBy}
                            sortOrder={runtimeSorting.sortOrder}
                            onSortChange={runtimeSorting.handleSortChange}
                        >
                            Project
                        </AdminSortableTableHeaderCell>
                        <AdminSortableTableHeaderCell
                            className="py-2 pr-4 font-semibold"
                            label="port"
                            sortBy="port"
                            activeSortBy={runtimeSorting.sortBy}
                            sortOrder={runtimeSorting.sortOrder}
                            onSortChange={runtimeSorting.handleSortChange}
                        >
                            Port
                        </AdminSortableTableHeaderCell>
                        <AdminSortableTableHeaderCell
                            className="py-2 pr-4 font-semibold"
                            label="mode"
                            sortBy="mode"
                            activeSortBy={runtimeSorting.sortBy}
                            sortOrder={runtimeSorting.sortOrder}
                            onSortChange={runtimeSorting.handleSortChange}
                        >
                            Mode
                        </AdminSortableTableHeaderCell>
                        <AdminSortableTableHeaderCell
                            className="py-2 pr-4 font-semibold"
                            label="status"
                            sortBy="status"
                            activeSortBy={runtimeSorting.sortBy}
                            sortOrder={runtimeSorting.sortOrder}
                            onSortChange={runtimeSorting.handleSortChange}
                        >
                            Status
                        </AdminSortableTableHeaderCell>
                        <AdminSortableTableHeaderCell
                            className="py-2 pr-4 font-semibold"
                            label="started"
                            sortBy="startedAt"
                            activeSortBy={runtimeSorting.sortBy}
                            sortOrder={runtimeSorting.sortOrder}
                            onSortChange={runtimeSorting.handleSortChange}
                        >
                            Started
                        </AdminSortableTableHeaderCell>
                        <AdminSortableTableHeaderCell
                            className="py-2 pr-4 font-semibold"
                            label="command"
                            sortBy="command"
                            activeSortBy={runtimeSorting.sortBy}
                            sortOrder={runtimeSorting.sortOrder}
                            onSortChange={runtimeSorting.handleSortChange}
                        >
                            Command
                        </AdminSortableTableHeaderCell>
                        <th className="py-2 pr-4 font-semibold">Action</th>
                    </tr>
                </thead>
                <tbody>
                    {runtimeSorting.sortedRows.map((runtime) => (
                        <tr key={runtime.id} className="border-b border-gray-100 last:border-0">
                            <td className="py-2 pr-4">
                                <Link
                                    href={runtime.projectHref}
                                    className="font-medium text-gray-900 hover:text-blue-700 hover:underline"
                                >
                                    {runtime.projectName}
                                </Link>
                                <div className="font-mono text-xs text-gray-400">{runtime.agentPermanentId}</div>
                            </td>
                            <td className="py-2 pr-4">
                                <a
                                    href={runtime.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 font-mono text-blue-700 hover:text-blue-900 hover:underline"
                                >
                                    {runtime.port}
                                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                                </a>
                            </td>
                            <td className="py-2 pr-4 text-gray-700">{formatAgentProjectRuntimeMode(runtime.mode)}</td>
                            <td className="py-2 pr-4">
                                <AgentProjectRuntimeStatusBadge isRunning={runtime.isRunning}>
                                    {formatAgentProjectRuntimeStatus(runtime)}
                                </AgentProjectRuntimeStatusBadge>
                            </td>
                            <td className="py-2 pr-4 text-gray-500">
                                {formatResourceMonitorMeasuredAt(runtime.startedAt)}
                            </td>
                            <td className="max-w-64 truncate py-2 pr-4 font-mono text-xs text-gray-500">
                                {runtime.command || ''}
                            </td>
                            <td className="py-2 pr-4">
                                <form action={$terminateAgentProjectRuntimeFromResourceMonitorAction.bind(null, runtime.id)}>
                                    <button
                                        type="submit"
                                        className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                                    >
                                        <Square className="h-3.5 w-3.5" aria-hidden />
                                        {runtime.isRunning ? 'Terminate' : 'Release'}
                                    </button>
                                </form>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/**
 * Renders sortable network traffic counters.
 *
 * @param props - Network props.
 * @returns Network table or fallback.
 * @private internal component of <ResourceMonitorPage/>
 */
export function NetworkUsageTable({ snapshot }: ResourceMonitorTableProps) {
    const networkSorting = useAdminTableSorting<NetworkInterfaceResourceUsage, NetworkUsageTableSortField>({
        rows: snapshot.network.interfaces,
        defaultSortBy: 'name',
        resolveDefaultSortOrder: resolveNetworkUsageDefaultSortOrder,
        resolveSortValue: resolveNetworkUsageSortValue,
    });

    if (!snapshot.network.isTrafficAvailable) {
        return (
            <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                {snapshot.network.errorMessage || 'Network traffic counters are not available.'}
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
                <thead>
                    <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-400">
                        <AdminSortableTableHeaderCell
                            className="py-2 pr-4 font-semibold"
                            label="interface"
                            sortBy="name"
                            activeSortBy={networkSorting.sortBy}
                            sortOrder={networkSorting.sortOrder}
                            onSortChange={networkSorting.handleSortChange}
                        >
                            Interface
                        </AdminSortableTableHeaderCell>
                        <AdminSortableTableHeaderCell
                            className="py-2 pr-4 font-semibold"
                            label="received"
                            sortBy="receivedBytes"
                            activeSortBy={networkSorting.sortBy}
                            sortOrder={networkSorting.sortOrder}
                            onSortChange={networkSorting.handleSortChange}
                        >
                            Received
                        </AdminSortableTableHeaderCell>
                        <AdminSortableTableHeaderCell
                            className="py-2 pr-4 font-semibold"
                            label="sent"
                            sortBy="transmittedBytes"
                            activeSortBy={networkSorting.sortBy}
                            sortOrder={networkSorting.sortOrder}
                            onSortChange={networkSorting.handleSortChange}
                        >
                            Sent
                        </AdminSortableTableHeaderCell>
                        <AdminSortableTableHeaderCell
                            className="py-2 pr-4 font-semibold"
                            label="receive rate"
                            sortBy="receivedBytesPerSecond"
                            activeSortBy={networkSorting.sortBy}
                            sortOrder={networkSorting.sortOrder}
                            onSortChange={networkSorting.handleSortChange}
                        >
                            Receive rate
                        </AdminSortableTableHeaderCell>
                        <AdminSortableTableHeaderCell
                            className="py-2 pr-4 font-semibold"
                            label="send rate"
                            sortBy="transmittedBytesPerSecond"
                            activeSortBy={networkSorting.sortBy}
                            sortOrder={networkSorting.sortOrder}
                            onSortChange={networkSorting.handleSortChange}
                        >
                            Send rate
                        </AdminSortableTableHeaderCell>
                    </tr>
                </thead>
                <tbody>
                    {networkSorting.sortedRows.map((networkInterface) => (
                        <tr key={networkInterface.name} className="border-b border-gray-100 last:border-0">
                            <td className="py-2 pr-4 font-mono text-gray-900">{networkInterface.name}</td>
                            <td className="py-2 pr-4 text-gray-700">
                                {formatResourceBytes(networkInterface.receivedBytes)}
                            </td>
                            <td className="py-2 pr-4 text-gray-700">
                                {formatResourceBytes(networkInterface.transmittedBytes)}
                            </td>
                            <td className="py-2 pr-4 text-gray-700">
                                {formatResourceRate(networkInterface.receivedBytesPerSecond)}
                            </td>
                            <td className="py-2 pr-4 text-gray-700">
                                {formatResourceRate(networkInterface.transmittedBytesPerSecond)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/**
 * Resolves the default order for agent project usage columns.
 *
 * @private internal helper of <AgentProjectsUsageTable/>
 */
function resolveAgentProjectsUsageDefaultSortOrder(sortBy: AgentProjectsUsageTableSortField): AdminTableSortOrder {
    return sortBy === 'sizeBytes' ? 'desc' : 'asc';
}

/**
 * Resolves a comparable value for one agent project usage row.
 *
 * @private internal helper of <AgentProjectsUsageTable/>
 */
function resolveAgentProjectsUsageSortValue(
    agentUsage: AgentProjectsResourceAgentUsage,
    sortBy: AgentProjectsUsageTableSortField,
) {
    if (sortBy === 'agent') {
        return agentUsage.agentName || agentUsage.agentPermanentId;
    }

    if (sortBy === 'projects') {
        return agentUsage.projects
            .map((project) => project.displayName || project.projectName)
            .join(' ');
    }

    return agentUsage.sizeBytes;
}

/**
 * Resolves the default order for project runtime columns.
 *
 * @private internal helper of <AgentProjectRuntimesTable/>
 */
function resolveAgentProjectRuntimesDefaultSortOrder(sortBy: AgentProjectRuntimesTableSortField): AdminTableSortOrder {
    return sortBy === 'port' || sortBy === 'startedAt' ? 'desc' : 'asc';
}

/**
 * Resolves a comparable value for one project runtime row.
 *
 * @private internal helper of <AgentProjectRuntimesTable/>
 */
function resolveAgentProjectRuntimesSortValue(
    runtime: ServerResourceMonitorSnapshot['projectRuntimes']['runtimes'][number],
    sortBy: AgentProjectRuntimesTableSortField,
) {
    return runtime[sortBy];
}

/**
 * Resolves the default order for network usage columns.
 *
 * @private internal helper of <NetworkUsageTable/>
 */
function resolveNetworkUsageDefaultSortOrder(sortBy: NetworkUsageTableSortField): AdminTableSortOrder {
    return sortBy === 'name' ? 'asc' : 'desc';
}

/**
 * Resolves a comparable value for one network usage row.
 *
 * @private internal helper of <NetworkUsageTable/>
 */
function resolveNetworkUsageSortValue(
    networkInterface: NetworkInterfaceResourceUsage,
    sortBy: NetworkUsageTableSortField,
) {
    return networkInterface[sortBy];
}
