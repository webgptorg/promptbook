import { ExternalLink, File, Folder, FolderUp, RefreshCcw } from 'lucide-react';
import Link from 'next/link';

import type { InternalS3BrowserEntry, InternalS3BrowserSnapshot } from '../../../utils/internalS3/internalS3Types';
import { formatResourceBytes } from '../../../utils/resourceMonitor/formatResourceMonitorValue';

/**
 * Human-readable limit matching the S3 browser listing cap.
 *
 * @private shared storage admin UI constant
 */
const S3_BROWSER_VISIBLE_LIMIT_LABEL = '1,000';

/**
 * Props accepted by `S3BrowserPanel`.
 *
 * @private shared storage admin UI type
 */
type S3BrowserPanelProps = {
    /**
     * Directory snapshot to render.
     */
    readonly browser: InternalS3BrowserSnapshot;

    /**
     * Route that owns the `prefix` query parameter.
     */
    readonly route: string;

    /**
     * Panel heading.
     */
    readonly title?: string;

    /**
     * Label shown before the absolute S3 prefix.
     */
    readonly prefixLabel?: string;

    /**
     * Empty-state message.
     */
    readonly emptyMessage?: string;
};

/**
 * Shared directory-style S3 object browser used by storage administration pages.
 *
 * @param props - Browser panel props.
 * @returns S3 browser panel.
 * @private shared storage admin UI component
 */
export function S3BrowserPanel({
    browser,
    route,
    title = 'File browser',
    prefixLabel = 'S3 prefix',
    emptyMessage = 'No objects found.',
}: S3BrowserPanelProps) {
    return (
        <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-4 md:flex-row md:items-start md:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <Folder className="h-5 w-5 text-gray-500" aria-hidden />
                        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                    </div>
                    <S3BrowserBreadcrumbs relativePrefix={browser.relativePrefix} route={route} />
                    <p className="mt-2 text-xs text-gray-500">
                        {prefixLabel}:{' '}
                        <span className="font-mono text-gray-700">{browser.absolutePrefix || 'bucket root'}</span>
                    </p>
                </div>
                <Link
                    href={buildS3BrowserHref(route, browser.relativePrefix)}
                    className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                >
                    <RefreshCcw className="h-3.5 w-3.5" />
                    Refresh browser
                </Link>
            </div>

            {!browser.isAvailable ? (
                <div className="px-5 py-6 text-sm text-rose-700">{browser.errorMessage}</div>
            ) : (
                <S3BrowserTable browser={browser} route={route} emptyMessage={emptyMessage} />
            )}
        </section>
    );
}

/**
 * Renders breadcrumb links for the current S3 browser prefix.
 *
 * @param props - Breadcrumb props.
 * @returns Breadcrumb navigation.
 * @private helper of `S3BrowserPanel`
 */
function S3BrowserBreadcrumbs({ relativePrefix, route }: { readonly relativePrefix: string; readonly route: string }) {
    const segments = relativePrefix.replace(/\/+$/u, '').split('/').filter(Boolean);

    let cumulativePrefix = '';

    return (
        <nav className="mt-2 flex flex-wrap items-center gap-1 text-sm text-gray-500" aria-label="S3 prefix">
            <Link href={route} className="font-medium text-blue-600 hover:underline">
                root
            </Link>
            {segments.map((segment) => {
                cumulativePrefix = `${cumulativePrefix}${segment}/`;

                return (
                    <span key={cumulativePrefix} className="inline-flex items-center gap-1">
                        <span className="text-gray-300">/</span>
                        <Link
                            href={buildS3BrowserHref(route, cumulativePrefix)}
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
 * Renders S3 browser entries in a table.
 *
 * @param props - Table props.
 * @returns Browser table.
 * @private helper of `S3BrowserPanel`
 */
function S3BrowserTable({
    browser,
    route,
    emptyMessage,
}: {
    readonly browser: InternalS3BrowserSnapshot;
    readonly route: string;
    readonly emptyMessage: string;
}) {
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
                                        href={buildS3BrowserHref(route, browser.parentPrefix)}
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
                            <S3BrowserRow key={`${entry.kind}:${entry.key}`} entry={entry} route={route} />
                        ))}
                        {isEmpty ? (
                            <tr>
                                <td colSpan={5} className="px-5 py-6 text-center text-gray-500">
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : null}
                    </tbody>
                </table>
            </div>
            {browser.isTruncated ? (
                <div className="border-t border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900">
                    Showing the first {S3_BROWSER_VISIBLE_LIMIT_LABEL} entries in this prefix.
                </div>
            ) : null}
        </>
    );
}

/**
 * Renders one S3 browser table row.
 *
 * @param props - Row props.
 * @returns Browser row.
 * @private helper of `S3BrowserPanel`
 */
function S3BrowserRow({ entry, route }: { readonly entry: InternalS3BrowserEntry; readonly route: string }) {
    const Icon = entry.kind === 'directory' ? Folder : File;

    return (
        <tr className="border-b bg-white hover:bg-gray-50">
            <td className="px-5 py-3">
                {entry.kind === 'directory' && entry.relativePrefix !== null ? (
                    <Link
                        href={buildS3BrowserHref(route, entry.relativePrefix)}
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
            <td className="whitespace-nowrap px-5 py-3">{formatS3BrowserTimestamp(entry.lastModified)}</td>
            <td className="max-w-lg px-5 py-3">
                <span className="block truncate font-mono text-xs text-gray-500" title={entry.key}>
                    {entry.key}
                </span>
            </td>
        </tr>
    );
}

/**
 * Formats an S3 object timestamp.
 *
 * @param timestamp - ISO timestamp, or `null`.
 * @returns Display value.
 * @private helper of `S3BrowserPanel`
 */
function formatS3BrowserTimestamp(timestamp: string | null): string {
    if (!timestamp) {
        return '—';
    }

    return new Date(timestamp).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'medium',
    });
}

/**
 * Builds a route href for one S3 browser prefix.
 *
 * @param route - Route that owns the `prefix` query parameter.
 * @param relativePrefix - Relative S3 browser prefix.
 * @returns Browser route href.
 * @private helper of `S3BrowserPanel`
 */
function buildS3BrowserHref(route: string, relativePrefix: string): string {
    if (!relativePrefix) {
        return route;
    }

    const searchParams = new URLSearchParams();
    searchParams.set('prefix', relativePrefix);
    return `${route}?${searchParams.toString()}`;
}
