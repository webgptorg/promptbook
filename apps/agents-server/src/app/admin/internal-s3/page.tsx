import {
    Boxes,
    ExternalLink,
    File,
    FileStack,
    Folder,
    FolderUp,
    HardDrive,
    RefreshCcw,
    Server,
    type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';

import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import { isUserGlobalAdmin } from '../../../utils/isUserGlobalAdmin';
import type {
    InternalS3BrowserEntry,
    InternalS3BrowserSnapshot,
    InternalS3Configuration,
    InternalS3Snapshot,
} from '../../../utils/internalS3/internalS3Types';
import { readInternalS3Directory } from '../../../utils/internalS3/readInternalS3Directory';
import { readInternalS3Snapshot } from '../../../utils/internalS3/readInternalS3Snapshot';
import { formatResourceBytes } from '../../../utils/resourceMonitor/formatResourceMonitorValue';
import { AdminStorageTabs } from '../_components/AdminStorageTabs';

/**
 * Forces a fresh configuration read and live probe on every request.
 */
export const dynamic = 'force-dynamic';

/**
 * Value shown when a configuration entry is not set.
 *
 * @private internal helper of `/admin/internal-s3`
 */
const INTERNAL_S3_EMPTY_VALUE = '—';

/**
 * Visual tone used across status cards and the status banner.
 *
 * @private internal helper of `/admin/internal-s3`
 */
type InternalS3Tone = 'positive' | 'warning' | 'critical' | 'muted';

/**
 * One label/value row rendered in the configuration detail list.
 *
 * @private internal helper of `/admin/internal-s3`
 */
type InternalS3DetailItem = {
    readonly label: string;
    readonly value: string;
    readonly isMonospace?: boolean;
};

/**
 * Banner and card container tone class names.
 *
 * @private internal helper of `/admin/internal-s3`
 */
const INTERNAL_S3_TONE_CONTAINER_CLASS_NAMES: Record<InternalS3Tone, string> = {
    positive: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    warning: 'border-amber-300 bg-amber-50 text-amber-900',
    critical: 'border-rose-200 bg-rose-50 text-rose-800',
    muted: 'border-gray-200 bg-gray-50 text-gray-700',
};

/**
 * Human-readable limit matching `INTERNAL_S3_BROWSER_MAX_KEYS`.
 *
 * @private internal helper of `/admin/internal-s3`
 */
const INTERNAL_S3_BROWSER_VISIBLE_LIMIT_LABEL = '1,000';

/**
 * Props accepted by the internal S3 page.
 *
 * @private route props of `/admin/internal-s3`
 */
type InternalS3PageProps = {
    /**
     * Query parameters controlling the object browser.
     */
    readonly searchParams?: Promise<{
        readonly prefix?: string;
    }>;
};

/**
 * Super-admin page showing the bundled self-contained (internal) S3 storage status.
 */
export default async function InternalS3Page({ searchParams }: InternalS3PageProps) {
    if (!(await isUserGlobalAdmin())) {
        return <ForbiddenPage />;
    }

    const snapshot = await readInternalS3Snapshot();
    const resolvedSearchParams = await searchParams;
    const browser = await readInternalS3Directory(snapshot.configuration, resolvedSearchParams?.prefix);

    return (
        <div className="container mx-auto space-y-6 px-4 py-8">
            <InternalS3Header checkedAt={snapshot.checkedAt} />
            <AdminStorageTabs activePage="internal-s3" />
            <InternalS3StatusBanner snapshot={snapshot} />
            <InternalS3SummaryGrid snapshot={snapshot} />
            <InternalS3BrowserPanel browser={browser} />
            <InternalS3ConfigurationPanel configuration={snapshot.configuration} />
        </div>
    );
}

/**
 * Renders the page header and a refresh action.
 *
 * @param props - Header props.
 * @returns Header element.
 */
function InternalS3Header({ checkedAt }: { readonly checkedAt: string }) {
    return (
        <div className="mt-20 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">Super Admin</p>
                <h1 className="mt-1 flex items-center gap-2 text-3xl font-light text-gray-900">
                    <Boxes className="h-7 w-7 text-gray-400" aria-hidden />
                    Internal S3
                </h1>
                <p className="mt-1 max-w-3xl text-sm text-gray-500">
                    Bundled self-contained S3 (VersityGW) object storage used for uploaded files on this standalone
                    server.
                </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <span className="rounded-md border border-gray-200 bg-white px-3 py-1.5">
                    Checked: <span className="font-mono text-gray-700">{formatInternalS3Timestamp(checkedAt)}</span>
                </span>
                <Link
                    href="/admin/internal-s3"
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
 * Renders the overall internal S3 status banner.
 *
 * @param props - Banner props.
 * @returns Status banner.
 */
function InternalS3StatusBanner({ snapshot }: { readonly snapshot: InternalS3Snapshot }) {
    const status = resolveInternalS3Status(snapshot);

    return (
        <div className={`rounded-lg border px-4 py-3 text-sm ${INTERNAL_S3_TONE_CONTAINER_CLASS_NAMES[status.tone]}`}>
            <p className="font-semibold">{status.title}</p>
            {status.message ? <p className="mt-1">{status.message}</p> : null}
        </div>
    );
}

/**
 * Renders the top summary cards.
 *
 * @param props - Summary props.
 * @returns Summary grid.
 */
function InternalS3SummaryGrid({ snapshot }: { readonly snapshot: InternalS3Snapshot }) {
    const { configuration, health } = snapshot;
    const isReachable = health?.isReachable ?? null;

    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <InternalS3SummaryCard
                icon={Boxes}
                label="Self-contained storage"
                value={configuration.isSelfContainedS3Selected ? 'Active' : 'Inactive'}
                caption={
                    configuration.storageMode
                        ? `Storage mode: ${configuration.storageMode}`
                        : 'No storage mode configured'
                }
                tone={configuration.isSelfContainedS3Selected ? 'positive' : 'muted'}
            />
            <InternalS3SummaryCard
                icon={Server}
                label="Connectivity"
                value={resolveConnectivityLabel(isReachable)}
                caption={
                    health === null
                        ? 'Live check not performed'
                        : health.latencyMs !== null
                          ? `Responded in ${formatInternalS3Latency(health.latencyMs)}`
                          : (health.errorMessage ?? 'No response')
                }
                tone={resolveConnectivityTone(isReachable)}
            />
            <InternalS3SummaryCard
                icon={FileStack}
                label="Objects stored"
                value={formatInternalS3Count(health?.statistics?.objectCount ?? null)}
                caption={
                    health?.statistics?.isListingTruncated
                        ? 'Counting stopped at the safety cap (lower bound)'
                        : configuration.pathPrefix
                          ? `Under prefix ${configuration.pathPrefix}/`
                          : 'Across the whole bucket'
                }
                tone="neutral"
            />
            <InternalS3SummaryCard
                icon={HardDrive}
                label="Total size"
                value={
                    health?.statistics ? formatResourceBytes(health.statistics.totalSizeBytes) : 'Not available'
                }
                caption={health?.statistics ? 'Sum of counted object sizes' : 'Requires a successful live check'}
                tone="neutral"
            />
        </div>
    );
}

/**
 * Single summary card for one internal S3 metric.
 *
 * @param props - Card props.
 * @returns Metric card.
 */
function InternalS3SummaryCard({
    icon: Icon,
    label,
    value,
    caption,
    tone,
}: {
    readonly icon: LucideIcon;
    readonly label: string;
    readonly value: string;
    readonly caption: string;
    readonly tone: InternalS3Tone | 'neutral';
}) {
    const cardToneClassName =
        tone === 'neutral' ? 'border-gray-200 bg-white' : INTERNAL_S3_TONE_CONTAINER_CLASS_NAMES[tone];

    return (
        <section className={`rounded-lg border p-5 shadow-sm ${cardToneClassName}`}>
            <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>
                <Icon className="h-5 w-5 shrink-0 text-gray-400" aria-hidden />
            </div>
            <div className="mt-2 text-3xl font-light text-gray-950">{value}</div>
            <div className="mt-1 min-h-10 text-sm text-gray-500">{caption}</div>
        </section>
    );
}

/**
 * Renders the configuration detail panel.
 *
 * @param props - Configuration props.
 * @returns Configuration panel.
 */
function InternalS3ConfigurationPanel({ configuration }: { readonly configuration: InternalS3Configuration }) {
    const detailItems: InternalS3DetailItem[] = [
        { label: 'Storage mode', value: configuration.storageMode ?? 'Not set' },
        { label: 'Self-contained active', value: formatInternalS3Boolean(configuration.isSelfContainedS3Selected) },
        { label: 'Fully configured', value: formatInternalS3Boolean(configuration.isS3StorageConfigured) },
        { label: 'Endpoint', value: configuration.endpoint ?? INTERNAL_S3_EMPTY_VALUE, isMonospace: true },
        { label: 'Bucket', value: configuration.bucket ?? INTERNAL_S3_EMPTY_VALUE, isMonospace: true },
        { label: 'Region', value: configuration.region ?? INTERNAL_S3_EMPTY_VALUE, isMonospace: true },
        { label: 'Path prefix', value: configuration.pathPrefix ?? INTERNAL_S3_EMPTY_VALUE, isMonospace: true },
        { label: 'Public URL', value: configuration.publicUrl ?? INTERNAL_S3_EMPTY_VALUE, isMonospace: true },
        { label: 'Force path style', value: formatInternalS3Boolean(configuration.isForcePathStyleEnabled) },
        { label: 'Access key id', value: configuration.accessKeyId ?? INTERNAL_S3_EMPTY_VALUE, isMonospace: true },
        {
            label: 'Secret access key',
            value: configuration.isSecretAccessKeyConfigured ? 'Configured' : 'Not configured',
        },
        { label: 'Data directory', value: configuration.dataDirectory ?? INTERNAL_S3_EMPTY_VALUE, isMonospace: true },
        { label: 'Service name', value: configuration.serviceName ?? INTERNAL_S3_EMPTY_VALUE, isMonospace: true },
        { label: 'Service port', value: configuration.port ?? INTERNAL_S3_EMPTY_VALUE, isMonospace: true },
    ];

    return (
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
                <Boxes className="h-5 w-5 text-gray-500" aria-hidden />
                <h2 className="text-lg font-semibold text-gray-900">Configuration</h2>
            </div>
            <dl className="space-y-3 text-sm">
                {detailItems.map((item) => (
                    <div key={item.label} className="grid gap-1 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)]">
                        <dt className="font-medium text-gray-500">{item.label}</dt>
                        <dd className={`min-w-0 break-words text-gray-900 ${item.isMonospace ? 'font-mono' : ''}`}>
                            {item.value}
                        </dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}

/**
 * Renders the internal S3 object browser panel.
 *
 * @param props - Browser props.
 * @returns Browser panel.
 */
function InternalS3BrowserPanel({ browser }: { readonly browser: InternalS3BrowserSnapshot }) {
    return (
        <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-4 md:flex-row md:items-start md:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <Folder className="h-5 w-5 text-gray-500" aria-hidden />
                        <h2 className="text-lg font-semibold text-gray-900">File browser</h2>
                    </div>
                    <InternalS3Breadcrumbs relativePrefix={browser.relativePrefix} />
                    <p className="mt-2 text-xs text-gray-500">
                        S3 prefix:{' '}
                        <span className="font-mono text-gray-700">{browser.absolutePrefix || 'bucket root'}</span>
                    </p>
                </div>
                <Link
                    href={buildInternalS3BrowserHref(browser.relativePrefix)}
                    className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                >
                    <RefreshCcw className="h-3.5 w-3.5" />
                    Refresh browser
                </Link>
            </div>

            {!browser.isAvailable ? (
                <div className="px-5 py-6 text-sm text-rose-700">{browser.errorMessage}</div>
            ) : (
                <InternalS3BrowserTable browser={browser} />
            )}
        </section>
    );
}

/**
 * Renders breadcrumb links for the current S3 browser prefix.
 *
 * @param props - Breadcrumb props.
 * @returns Breadcrumb navigation.
 */
function InternalS3Breadcrumbs({ relativePrefix }: { readonly relativePrefix: string }) {
    const segments = relativePrefix
        .replace(/\/+$/u, '')
        .split('/')
        .filter(Boolean);

    let cumulativePrefix = '';

    return (
        <nav className="mt-2 flex flex-wrap items-center gap-1 text-sm text-gray-500" aria-label="S3 prefix">
            <Link href="/admin/internal-s3" className="font-medium text-blue-600 hover:underline">
                root
            </Link>
            {segments.map((segment) => {
                cumulativePrefix = `${cumulativePrefix}${segment}/`;

                return (
                    <span key={cumulativePrefix} className="inline-flex items-center gap-1">
                        <span className="text-gray-300">/</span>
                        <Link
                            href={buildInternalS3BrowserHref(cumulativePrefix)}
                            className="font-medium text-blue-600 hover:underline"
                        >
                            {segment}
                        </Link>
                    </span>
                );
            })}
        </nav>
    );
}

/**
 * Renders internal S3 browser entries in a table.
 *
 * @param props - Table props.
 * @returns Browser table.
 */
function InternalS3BrowserTable({ browser }: { readonly browser: InternalS3BrowserSnapshot }) {
    const isEmpty = browser.entries.length === 0 && browser.parentPrefix === null;

    return (
        <>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-500">
                    <thead className="border-b bg-gray-50 text-xs uppercase text-gray-700">
                        <tr>
                            <th className="px-5 py-3">Name</th>
                            <th className="px-5 py-3">Type</th>
                            <th className="px-5 py-3 text-right">Size</th>
                            <th className="px-5 py-3">Last Modified</th>
                            <th className="px-5 py-3">S3 Key</th>
                        </tr>
                    </thead>
                    <tbody>
                        {browser.parentPrefix !== null ? (
                            <tr className="border-b bg-white hover:bg-gray-50">
                                <td className="px-5 py-3">
                                    <Link
                                        href={buildInternalS3BrowserHref(browser.parentPrefix)}
                                        className="inline-flex items-center gap-2 font-medium text-blue-600 hover:underline"
                                    >
                                        <FolderUp className="h-4 w-4" aria-hidden />
                                        ..
                                    </Link>
                                </td>
                                <td className="px-5 py-3">Parent folder</td>
                                <td className="px-5 py-3 text-right">—</td>
                                <td className="px-5 py-3">—</td>
                                <td className="px-5 py-3 font-mono text-xs text-gray-400">—</td>
                            </tr>
                        ) : null}
                        {browser.entries.map((entry) => (
                            <InternalS3BrowserRow key={`${entry.kind}:${entry.key}`} entry={entry} />
                        ))}
                        {isEmpty ? (
                            <tr>
                                <td colSpan={5} className="px-5 py-6 text-center text-gray-500">
                                    No objects found.
                                </td>
                            </tr>
                        ) : null}
                    </tbody>
                </table>
            </div>
            {browser.isTruncated ? (
                <div className="border-t border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900">
                    Showing the first {INTERNAL_S3_BROWSER_VISIBLE_LIMIT_LABEL} entries in this prefix.
                </div>
            ) : null}
        </>
    );
}

/**
 * Renders one internal S3 browser table row.
 *
 * @param props - Row props.
 * @returns Browser row.
 */
function InternalS3BrowserRow({ entry }: { readonly entry: InternalS3BrowserEntry }) {
    const Icon = entry.kind === 'directory' ? Folder : File;

    return (
        <tr className="border-b bg-white hover:bg-gray-50">
            <td className="px-5 py-3">
                {entry.kind === 'directory' && entry.relativePrefix !== null ? (
                    <Link
                        href={buildInternalS3BrowserHref(entry.relativePrefix)}
                        className="inline-flex max-w-md items-center gap-2 font-medium text-blue-600 hover:underline"
                    >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden />
                        <span className="truncate" title={entry.name}>
                            {entry.name}
                        </span>
                    </Link>
                ) : entry.publicUrl ? (
                    <a
                        href={entry.publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex max-w-md items-center gap-2 font-medium text-blue-600 hover:underline"
                    >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden />
                        <span className="truncate" title={entry.name}>
                            {entry.name}
                        </span>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    </a>
                ) : (
                    <span className="inline-flex max-w-md items-center gap-2 text-gray-900">
                        <Icon className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                        <span className="truncate" title={entry.name}>
                            {entry.name}
                        </span>
                    </span>
                )}
            </td>
            <td className="px-5 py-3">{entry.kind === 'directory' ? 'Folder' : 'Object'}</td>
            <td className="px-5 py-3 text-right">
                {entry.sizeBytes === null ? '—' : formatResourceBytes(entry.sizeBytes)}
            </td>
            <td className="px-5 py-3 whitespace-nowrap">{formatInternalS3BrowserTimestamp(entry.lastModified)}</td>
            <td className="max-w-lg px-5 py-3">
                <span className="block truncate font-mono text-xs text-gray-500" title={entry.key}>
                    {entry.key}
                </span>
            </td>
        </tr>
    );
}

/**
 * Resolves the banner tone, title, and message from a snapshot.
 *
 * @param snapshot - Internal S3 snapshot.
 * @returns Banner descriptor.
 * @private internal helper of `/admin/internal-s3`
 */
function resolveInternalS3Status(snapshot: InternalS3Snapshot): {
    readonly tone: InternalS3Tone;
    readonly title: string;
    readonly message: string;
} {
    const { configuration, health, probeSkippedReason } = snapshot;

    if (!configuration.isSelfContainedS3Selected) {
        return {
            tone: 'muted',
            title: 'Self-contained S3 is not the active storage',
            message: probeSkippedReason ?? '',
        };
    }

    if (health === null) {
        return {
            tone: 'warning',
            title: 'Self-contained S3 is not fully configured',
            message: probeSkippedReason ?? '',
        };
    }

    if (health.isReachable) {
        return {
            tone: 'positive',
            title: 'Internal S3 storage is reachable',
            message: 'The bundled VersityGW storage responded to a live object listing.',
        };
    }

    return {
        tone: 'critical',
        title: 'Internal S3 storage is not reachable',
        message: health.errorMessage ?? 'The live object listing did not succeed.',
    };
}

/**
 * Resolves the connectivity summary label.
 *
 * @param isReachable - Reachability flag, or `null` when not checked.
 * @returns Display label.
 * @private internal helper of `/admin/internal-s3`
 */
function resolveConnectivityLabel(isReachable: boolean | null): string {
    if (isReachable === null) {
        return 'Not checked';
    }

    return isReachable ? 'Reachable' : 'Unreachable';
}

/**
 * Resolves the connectivity card tone.
 *
 * @param isReachable - Reachability flag, or `null` when not checked.
 * @returns Card tone.
 * @private internal helper of `/admin/internal-s3`
 */
function resolveConnectivityTone(isReachable: boolean | null): InternalS3Tone {
    if (isReachable === null) {
        return 'muted';
    }

    return isReachable ? 'positive' : 'critical';
}

/**
 * Formats a nullable object count for display.
 *
 * @param count - Object count, or `null`.
 * @returns Display value.
 * @private internal helper of `/admin/internal-s3`
 */
function formatInternalS3Count(count: number | null): string {
    return count === null ? 'Not available' : count.toLocaleString();
}

/**
 * Formats a probe latency for display.
 *
 * @param latencyMs - Latency in milliseconds.
 * @returns Display value.
 * @private internal helper of `/admin/internal-s3`
 */
function formatInternalS3Latency(latencyMs: number): string {
    return `${latencyMs.toLocaleString()} ms`;
}

/**
 * Formats a boolean configuration flag for display.
 *
 * @param value - Flag value.
 * @returns `Yes` or `No`.
 * @private internal helper of `/admin/internal-s3`
 */
function formatInternalS3Boolean(value: boolean): string {
    return value ? 'Yes' : 'No';
}

/**
 * Formats the snapshot timestamp.
 *
 * @param checkedAt - ISO timestamp.
 * @returns Display value.
 * @private internal helper of `/admin/internal-s3`
 */
function formatInternalS3Timestamp(checkedAt: string): string {
    return new Date(checkedAt).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'medium',
    });
}

/**
 * Formats an internal S3 object timestamp.
 *
 * @param timestamp - ISO timestamp, or `null`.
 * @returns Display value.
 * @private internal helper of `/admin/internal-s3`
 */
function formatInternalS3BrowserTimestamp(timestamp: string | null): string {
    if (!timestamp) {
        return '—';
    }

    return formatInternalS3Timestamp(timestamp);
}

/**
 * Builds a route href for one internal S3 browser prefix.
 *
 * @param relativePrefix - Relative S3 browser prefix.
 * @returns Internal S3 page href.
 * @private internal helper of `/admin/internal-s3`
 */
function buildInternalS3BrowserHref(relativePrefix: string): string {
    if (!relativePrefix) {
        return '/admin/internal-s3';
    }

    const searchParams = new URLSearchParams();
    searchParams.set('prefix', relativePrefix);
    return `/admin/internal-s3?${searchParams.toString()}`;
}
