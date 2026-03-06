import { ForbiddenPage } from '@/src/components/ForbiddenPage/ForbiddenPage';
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { formatAgentNamingText } from '@/src/utils/agentNaming';
import { getAgentNaming } from '@/src/utils/getAgentNaming';
import { isUserAdmin } from '@/src/utils/isUserAdmin';
import { ArrowLeftIcon, HistoryIcon } from 'lucide-react';
import Link from 'next/link';
import { RestoreVersionButton } from './RestoreVersionButton';

/**
 * Maximum number of history entries rendered on one page load.
 */
const HISTORY_PAGE_LIMIT = 120;

/**
 * Maximum number of characters shown in one history preview line.
 */
const HISTORY_PREVIEW_MAX_LENGTH = 140;

/**
 * Generates metadata for the agent history page.
 *
 * @returns Metadata for the page.
 */
export async function generateMetadata() {
    const agentNaming = await getAgentNaming();
    return {
        title: formatAgentNamingText('Book Version History', agentNaming),
    };
}

/**
 * Creates one short single-line preview from a full agent source snapshot.
 *
 * @param source - Full saved agent source.
 * @returns Compact summary line suitable for list previews.
 */
function createHistorySourcePreview(source: string): string {
    const firstNonEmptyLine =
        source
            .split(/\r?\n/)
            .map((line) => line.trim())
            .find((line) => line.length > 0) || '(empty source)';

    if (firstNonEmptyLine.length <= HISTORY_PREVIEW_MAX_LENGTH) {
        return firstNonEmptyLine;
    }

    return `${firstNonEmptyLine.slice(0, HISTORY_PREVIEW_MAX_LENGTH - 1)}...`;
}

/**
 * Formats the history timestamp in a readable local format.
 *
 * @param value - ISO timestamp saved in history.
 * @returns Human-friendly local date and time.
 */
function formatHistoryTimestamp(value: string): string {
    return new Date(value).toLocaleString();
}

/**
 * Renders the agent source version history with preview + restore actions.
 */
export default async function AgentHistoryPage({ params }: { params: Promise<{ agentName: string }> }) {
    const { agentName: rawAgentName } = await params;
    const agentName = decodeURIComponent(rawAgentName);

    if (!(await isUserAdmin())) {
        return <ForbiddenPage />;
    }

    const collection = await $provideAgentCollectionForServer();
    const agentPermanentId = await collection.getAgentPermanentId(agentName);
    const history = await collection.listAgentHistory(agentPermanentId, { limit: HISTORY_PAGE_LIMIT });
    const agentNaming = await getAgentNaming();
    const hasTruncatedHistory = history.length === HISTORY_PAGE_LIMIT;

    return (
        <div className="container mx-auto max-w-5xl p-6">
            <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                    <div className="rounded-full bg-blue-100 p-3">
                        <HistoryIcon className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Book history: {agentName}</h1>
                        <p className="text-gray-600">
                            {formatAgentNamingText(
                                'Open any saved version to inspect its full source and restore it when needed.',
                                agentNaming,
                            )}
                        </p>
                    </div>
                </div>

                <Link
                    href={`/agents/${encodeURIComponent(agentName)}/book`}
                    className="inline-flex items-center gap-2 self-start rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                    <ArrowLeftIcon className="h-4 w-4" />
                    Back to Book
                </Link>
            </header>

            {history.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-12 text-center">
                    <p className="text-lg text-gray-500">No history found</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {hasTruncatedHistory && (
                        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                            Showing the most recent {HISTORY_PAGE_LIMIT} saved versions.
                        </p>
                    )}

                    {history.map((item, index) => {
                        const versionNumber = history.length - index;
                        const isCurrentVersion = index === 0;
                        const versionLabel = isCurrentVersion
                            ? `Current saved version (v${versionNumber})`
                            : `Version ${versionNumber}`;
                        const sourcePreview = createHistorySourcePreview(item.agentSource);

                        return (
                            <article key={item.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                                <details open={isCurrentVersion} className="group">
                                    <summary className="cursor-pointer list-none p-4 hover:bg-gray-50">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="min-w-0">
                                                <p className="text-base font-semibold text-gray-900">{versionLabel}</p>
                                                <time className="mt-1 block text-sm text-gray-500">
                                                    {formatHistoryTimestamp(item.createdAt)}
                                                </time>
                                                <p className="mt-2 truncate text-sm text-gray-700">{sourcePreview}</p>
                                                <p className="mt-2 text-xs text-gray-500">
                                                    Hash: <code className="rounded bg-gray-100 px-1">{item.agentHash.slice(0, 12)}</code>
                                                </p>
                                            </div>
                                            <span className="text-xs font-semibold uppercase tracking-wide text-blue-600 group-open:hidden">
                                                Show source
                                            </span>
                                        </div>
                                    </summary>

                                    <div className="border-t border-gray-100 p-4">
                                        <pre className="max-h-[50vh] overflow-auto rounded-md border border-gray-200 bg-slate-950 p-4 text-xs leading-relaxed text-slate-100">
                                            {item.agentSource}
                                        </pre>

                                        <div className="mt-4 flex justify-end">
                                            <RestoreVersionButton
                                                agentName={agentName}
                                                agentPermanentId={agentPermanentId}
                                                historyId={item.id}
                                            />
                                        </div>
                                    </div>
                                </details>
                            </article>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
