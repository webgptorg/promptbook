import { Cpu, FolderKanban, HardDrive, MemoryStick, Network, RefreshCcw, TriangleAlert, type LucideIcon } from 'lucide-react';
import Link from 'next/link';

import { AgentProjectReferencesList } from '../../../components/AgentProjects/AgentProjectReferencesList';
import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import {
    ADMIN_AGENT_PROJECTS_DASHBOARD_HREF,
    buildAgentProjectsDashboardHref,
} from '../../../utils/agentProjects/agentProjectHrefs';
import { isUserGlobalAdmin } from '../../../utils/isUserGlobalAdmin';
import {
    formatResourceBytes,
    formatResourcePercentage,
    formatResourceRate,
} from '../../../utils/resourceMonitor/formatResourceMonitorValue';
import { readServerResourceMonitorSnapshot } from '../../../utils/resourceMonitor/readServerResourceMonitorSnapshot';
import type {
    ResourceMonitorResource,
    ServerResourceMonitorSnapshot,
    ServerResourceWarningIssue,
} from '../../../utils/resourceMonitor/resourceMonitorTypes';

/**
 * Forces fresh resource readings for every request.
 */
export const dynamic = 'force-dynamic';

/**
 * Visual tone for resource metric cards.
 */
type ResourceMetricTone = 'neutral' | 'warning' | 'unavailable';

/**
 * One row in a detail list.
 */
type DetailListItem = {
    readonly label: string;
    readonly value: string;
};

/**
 * Upper bound of per-agent project rows shown directly in the resource monitor.
 */
const MAX_LISTED_PROJECT_AGENTS = 25;

/**
 * Card tone class names.
 */
const METRIC_CARD_TONE_CLASS_NAMES: Record<ResourceMetricTone, string> = {
    neutral: 'border-gray-200 bg-white',
    warning: 'border-amber-300 bg-amber-50',
    unavailable: 'border-gray-200 bg-gray-50',
};

/**
 * Metric value tone class names.
 */
const METRIC_VALUE_TONE_CLASS_NAMES: Record<ResourceMetricTone, string> = {
    neutral: 'text-gray-950',
    warning: 'text-amber-900',
    unavailable: 'text-gray-500',
};

/**
 * Meter fill tone class names.
 */
const METER_FILL_TONE_CLASS_NAMES: Record<ResourceMetricTone, string> = {
    neutral: 'bg-emerald-500',
    warning: 'bg-amber-500',
    unavailable: 'bg-gray-300',
};

/**
 * Super-admin page showing live server resource usage.
 */
export default async function ResourceMonitorPage() {
    if (!(await isUserGlobalAdmin())) {
        return <ForbiddenPage />;
    }

    const snapshot = await readServerResourceMonitorSnapshot();

    return (
        <div className="container mx-auto space-y-6 px-4 py-8">
            <ResourceMonitorHeader measuredAt={snapshot.measuredAt} />
            <ResourceWarningBanner issues={snapshot.warningStatus.issues} />
            <ResourceSummaryGrid snapshot={snapshot} />
            <ResourceDetailGrid snapshot={snapshot} />
        </div>
    );
}

/**
 * Renders the page header and refresh action.
 *
 * @param props - Header props.
 * @returns Header element.
 */
function ResourceMonitorHeader({ measuredAt }: { readonly measuredAt: string }) {
    return (
        <div className="mt-20 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">Super Admin</p>
                <h1 className="mt-1 text-3xl font-light text-gray-900">Resource monitor</h1>
                <p className="mt-1 max-w-3xl text-sm text-gray-500">
                    Current CPU, memory, disk, and network usage for this Agents Server process and host.
                </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <span className="rounded-md border border-gray-200 bg-white px-3 py-1.5">
                    Measured: <span className="font-mono text-gray-700">{formatMeasuredAt(measuredAt)}</span>
                </span>
                <Link
                    href="/admin/resource-monitor"
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
 * Renders resource warning issues.
 *
 * @param props - Warning props.
 * @returns Warning banner.
 */
function ResourceWarningBanner({ issues }: { readonly issues: ReadonlyArray<ServerResourceWarningIssue> }) {
    if (issues.length === 0) {
        return (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Resources are within the configured warning thresholds.
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <div className="flex items-start gap-3">
                <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
                <div>
                    <p className="font-semibold">Resource pressure detected</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                        {issues.map((issue) => (
                            <li key={`${issue.resource}-${issue.message}`}>{issue.message}</li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}

/**
 * Renders the top resource summary cards.
 *
 * @param props - Summary props.
 * @returns Summary grid.
 */
function ResourceSummaryGrid({ snapshot }: { readonly snapshot: ServerResourceMonitorSnapshot }) {
    const isCpuWarning = isWarningIssuePresent(snapshot.warningStatus.issues, 'cpu');
    const isMemoryWarning = isWarningIssuePresent(snapshot.warningStatus.issues, 'memory');
    const isDiskWarning = isWarningIssuePresent(snapshot.warningStatus.issues, 'disk');
    const isDiskUsageAvailable = snapshot.disk.usedRatio !== null;
    const isNetworkTrafficAvailable = snapshot.network.isTrafficAvailable;

    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ResourceMetricCard
                icon={Cpu}
                label="CPU load"
                value={formatResourcePercentage(snapshot.cpu.loadRatio)}
                caption={`${formatLoadValue(snapshot.cpu.averageLoadOneMinute)} load across ${
                    snapshot.cpu.coreCount
                } logical cores`}
                tone={isCpuWarning ? 'warning' : 'neutral'}
                ratio={snapshot.cpu.loadRatio}
            />
            <ResourceMetricCard
                icon={MemoryStick}
                label="Memory used"
                value={formatResourcePercentage(snapshot.memory.usedRatio)}
                caption={`${formatResourceBytes(snapshot.memory.freeBytes)} free of ${formatResourceBytes(
                    snapshot.memory.totalBytes,
                )}`}
                tone={isMemoryWarning ? 'warning' : 'neutral'}
                ratio={snapshot.memory.usedRatio}
            />
            <ResourceMetricCard
                icon={HardDrive}
                label="Disk used"
                value={isDiskUsageAvailable ? formatResourcePercentage(snapshot.disk.usedRatio) : 'Not available'}
                caption={`${formatNullableBytes(snapshot.disk.availableBytes)} available on ${
                    snapshot.disk.inspectedPath
                }`}
                tone={!isDiskUsageAvailable ? 'unavailable' : isDiskWarning ? 'warning' : 'neutral'}
                ratio={snapshot.disk.usedRatio}
            />
            <ResourceMetricCard
                icon={FolderKanban}
                label="Agent projects"
                value={
                    snapshot.projects.errorMessage
                        ? 'Not available'
                        : formatResourceBytes(snapshot.projects.totalSizeBytes)
                }
                caption={
                    snapshot.projects.errorMessage ||
                    `${snapshot.projects.totalProjectCount} projects across ${snapshot.projects.agents.length} agents`
                }
                tone={snapshot.projects.errorMessage ? 'unavailable' : 'neutral'}
                ratio={null}
            />
            <ResourceMetricCard
                icon={Network}
                label="Network rate"
                value={
                    isNetworkTrafficAvailable
                        ? `In ${formatResourceRate(
                              snapshot.network.totalReceivedBytesPerSecond,
                          )} Out ${formatResourceRate(snapshot.network.totalTransmittedBytesPerSecond)}`
                        : 'Not available'
                }
                caption={`${snapshot.network.networkInterfaceCount} interfaces, ${snapshot.network.networkAddressCount} addresses`}
                tone={isNetworkTrafficAvailable ? 'neutral' : 'unavailable'}
                ratio={null}
            />
        </div>
    );
}

/**
 * Renders detailed CPU, memory, disk, and network panels.
 *
 * @param props - Detail props.
 * @returns Detail grid.
 */
function ResourceDetailGrid({ snapshot }: { readonly snapshot: ServerResourceMonitorSnapshot }) {
    const cpuItems: DetailListItem[] = [
        { label: '1-minute load', value: formatLoadValue(snapshot.cpu.averageLoadOneMinute) },
        { label: '5-minute load', value: formatLoadValue(snapshot.cpu.averageLoadFiveMinutes) },
        { label: '15-minute load', value: formatLoadValue(snapshot.cpu.averageLoadFifteenMinutes) },
        { label: 'Logical cores', value: snapshot.cpu.coreCount.toLocaleString() },
        { label: 'Process CPU sample', value: formatResourcePercentage(snapshot.cpu.processUsageRatio) },
    ];
    const memoryItems: DetailListItem[] = [
        { label: 'Total memory', value: formatResourceBytes(snapshot.memory.totalBytes) },
        { label: 'Free memory', value: formatResourceBytes(snapshot.memory.freeBytes) },
        { label: 'Process RSS', value: formatResourceBytes(snapshot.memory.processRssBytes) },
        { label: 'Heap used', value: formatResourceBytes(snapshot.memory.processHeapUsedBytes) },
        { label: 'Heap total', value: formatResourceBytes(snapshot.memory.processHeapTotalBytes) },
        { label: 'External memory', value: formatResourceBytes(snapshot.memory.processExternalBytes) },
        { label: 'Array buffers', value: formatResourceBytes(snapshot.memory.processArrayBuffersBytes) },
    ];
    const diskItems: DetailListItem[] = [
        { label: 'Path', value: snapshot.disk.inspectedPath },
        { label: 'Total space', value: formatNullableBytes(snapshot.disk.totalBytes) },
        { label: 'Free space', value: formatNullableBytes(snapshot.disk.freeBytes) },
        { label: 'Available space', value: formatNullableBytes(snapshot.disk.availableBytes) },
        { label: 'Used space', value: formatNullableBytes(snapshot.disk.usedBytes) },
        { label: 'Available ratio', value: formatResourcePercentage(snapshot.disk.availableRatio) },
        ...(snapshot.disk.errorMessage ? [{ label: 'Error', value: snapshot.disk.errorMessage }] : []),
    ];

    return (
        <div className="grid gap-6 xl:grid-cols-2">
            <ResourcePanel icon={Cpu} title="CPU">
                <DetailList items={cpuItems} />
            </ResourcePanel>
            <ResourcePanel icon={MemoryStick} title="Memory">
                <DetailList items={memoryItems} />
            </ResourcePanel>
            <ResourcePanel icon={HardDrive} title="Disk">
                <DetailList items={diskItems} />
            </ResourcePanel>
            <ResourcePanel icon={FolderKanban} title="Agent projects">
                <AgentProjectsUsageTable snapshot={snapshot} />
            </ResourcePanel>
            <ResourcePanel icon={Network} title="Network">
                <NetworkUsageTable snapshot={snapshot} />
            </ResourcePanel>
        </div>
    );
}

/**
 * Renders per-agent project storage usage.
 *
 * @param props - Projects props.
 * @returns Projects table or fallback.
 */
function AgentProjectsUsageTable({ snapshot }: { readonly snapshot: ServerResourceMonitorSnapshot }) {
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

    const listedAgents = snapshot.projects.agents.slice(0, MAX_LISTED_PROJECT_AGENTS);
    const omittedAgentCount = snapshot.projects.agents.length - listedAgents.length;

    return (
        <div className="space-y-3">
            <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-400">
                            <th className="py-2 pr-4 font-semibold">Agent</th>
                            <th className="py-2 pr-4 font-semibold">Projects</th>
                            <th className="py-2 pr-4 font-semibold">Total size</th>
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
                    {omittedAgentCount > 0 ? `…and ${omittedAgentCount} more agents. ` : ''}
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
 * Summary card for one monitored resource.
 *
 * @param props - Card props.
 * @returns Metric card.
 */
function ResourceMetricCard({
    icon: Icon,
    label,
    value,
    caption,
    tone,
    ratio,
}: {
    readonly icon: LucideIcon;
    readonly label: string;
    readonly value: string;
    readonly caption: string;
    readonly tone: ResourceMetricTone;
    readonly ratio: number | null;
}) {
    return (
        <section className={`rounded-lg border p-5 shadow-sm ${METRIC_CARD_TONE_CLASS_NAMES[tone]}`}>
            <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>
                <Icon className="h-5 w-5 shrink-0 text-gray-400" aria-hidden />
            </div>
            <div className={`mt-2 text-3xl font-light ${METRIC_VALUE_TONE_CLASS_NAMES[tone]}`}>{value}</div>
            <div className="mt-1 min-h-10 text-sm text-gray-500">{caption}</div>
            <ResourceMeter ratio={ratio} tone={tone} />
        </section>
    );
}

/**
 * Renders one resource utilization meter.
 *
 * @param props - Meter props.
 * @returns Meter element.
 */
function ResourceMeter({ ratio, tone }: { readonly ratio: number | null; readonly tone: ResourceMetricTone }) {
    const isRatioAvailable = ratio !== null && Number.isFinite(ratio);
    const percentage = isRatioAvailable ? Math.min(Math.max(ratio, 0), 1) * 100 : 0;

    return (
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100">
            <div
                className={`h-full rounded-full ${METER_FILL_TONE_CLASS_NAMES[tone]}`}
                style={{ width: `${percentage}%` }}
            />
        </div>
    );
}

/**
 * Bordered panel for detailed metrics.
 *
 * @param props - Panel props.
 * @returns Resource panel.
 */
function ResourcePanel({
    icon: Icon,
    title,
    children,
}: {
    readonly icon: LucideIcon;
    readonly title: string;
    readonly children: React.ReactNode;
}) {
    return (
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
                <Icon className="h-5 w-5 text-gray-500" aria-hidden />
                <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            </div>
            {children}
        </section>
    );
}

/**
 * Renders label/value rows.
 *
 * @param props - Detail list props.
 * @returns Detail list.
 */
function DetailList({ items }: { readonly items: ReadonlyArray<DetailListItem> }) {
    return (
        <dl className="space-y-3 text-sm">
            {items.map((item) => (
                <div key={item.label} className="grid gap-1 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)]">
                    <dt className="font-medium text-gray-500">{item.label}</dt>
                    <dd className="min-w-0 break-words text-gray-900">{item.value}</dd>
                </div>
            ))}
        </dl>
    );
}

/**
 * Renders network traffic counters.
 *
 * @param props - Network props.
 * @returns Network table or fallback.
 */
function NetworkUsageTable({ snapshot }: { readonly snapshot: ServerResourceMonitorSnapshot }) {
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
                        <th className="py-2 pr-4 font-semibold">Interface</th>
                        <th className="py-2 pr-4 font-semibold">Received</th>
                        <th className="py-2 pr-4 font-semibold">Sent</th>
                        <th className="py-2 pr-4 font-semibold">Receive rate</th>
                        <th className="py-2 pr-4 font-semibold">Send rate</th>
                    </tr>
                </thead>
                <tbody>
                    {snapshot.network.interfaces.map((networkInterface) => (
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
 * Returns whether a resource has an active warning issue.
 *
 * @param issues - Warning issues.
 * @param resource - Resource to find.
 * @returns `true` when the resource is warning.
 */
function isWarningIssuePresent(
    issues: ReadonlyArray<ServerResourceWarningIssue>,
    resource: ResourceMonitorResource,
): boolean {
    return issues.some((issue) => issue.resource === resource);
}

/**
 * Formats nullable byte values with a distinct unavailable fallback.
 *
 * @param bytes - Nullable byte count.
 * @returns Display value.
 */
function formatNullableBytes(bytes: number | null): string {
    return bytes === null ? 'Not available' : formatResourceBytes(bytes);
}

/**
 * Formats load average values.
 *
 * @param value - Nullable load average.
 * @returns Display value.
 */
function formatLoadValue(value: number | null): string {
    return value === null ? 'Not available' : value.toFixed(2);
}

/**
 * Formats the server measurement timestamp.
 *
 * @param measuredAt - ISO timestamp.
 * @returns Display value.
 */
function formatMeasuredAt(measuredAt: string): string {
    return new Date(measuredAt).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'medium',
    });
}
