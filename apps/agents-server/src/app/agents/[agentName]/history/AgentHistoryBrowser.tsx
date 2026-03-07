'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { RestoreVersionButton } from './RestoreVersionButton';

/**
 * One saved book version row rendered in the history browser.
 */
export type AgentHistoryEntry = {
    readonly id: number;
    readonly createdAt: string;
    readonly agentHash: string;
    readonly previousAgentHash: string | null;
    readonly agentSource: string;
    readonly promptbookEngineVersion: string;
};

/**
 * Props for the agent history browser.
 */
type AgentHistoryBrowserProps = {
    readonly agentName: string;
    readonly history: ReadonlyArray<AgentHistoryEntry>;
};

/**
 * Number of hash characters displayed in compact labels.
 */
const HASH_PREVIEW_LENGTH = 8;

/**
 * Extracts a short human-readable one-line preview from a book source.
 *
 * @param source - Full agent source.
 * @returns First non-empty line or fallback placeholder.
 */
function resolveSourcePreview(source: string): string {
    const firstNonEmptyLine = source
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find((line) => line.length > 0);
    return firstNonEmptyLine || 'Empty book version';
}

/**
 * Formats one version timestamp for UI display.
 *
 * @param value - ISO datetime string.
 * @returns Human-friendly datetime string.
 */
function formatVersionTimestamp(value: string): string {
    return new Date(value).toLocaleString();
}

/**
 * Client history browser with selectable versions and source preview.
 */
export function AgentHistoryBrowser({ agentName, history }: AgentHistoryBrowserProps) {
    const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(history[0]?.id ?? null);

    const selectedHistoryEntry = useMemo(() => {
        if (history.length === 0) {
            return null;
        }

        if (selectedHistoryId === null) {
            return history[0] || null;
        }

        return history.find((entry) => entry.id === selectedHistoryId) || history[0] || null;
    }, [history, selectedHistoryId]);

    if (history.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                <p className="text-lg text-gray-600">No history found for this book yet.</p>
                <Link
                    href={`/agents/${encodeURIComponent(agentName)}/book`}
                    className="mt-4 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
                >
                    Back to Book Editor
                </Link>
            </div>
        );
    }

    if (!selectedHistoryEntry) {
        return null;
    }

    return (
        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="min-h-0 overflow-y-auto rounded-xl border border-gray-200 bg-white p-3">
                <h2 className="mb-3 px-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Versions</h2>
                <div className="space-y-2">
                    {history.map((entry, index) => {
                        const isSelected = entry.id === selectedHistoryEntry.id;
                        return (
                            <button
                                key={entry.id}
                                type="button"
                                onClick={() => setSelectedHistoryId(entry.id)}
                                className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                                    isSelected
                                        ? 'border-blue-200 bg-blue-50 shadow-sm'
                                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-semibold text-gray-900">
                                        Version {history.length - index}
                                    </span>
                                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                                        {entry.agentHash.slice(0, HASH_PREVIEW_LENGTH)}
                                    </span>
                                </div>
                                <p className="mt-1 line-clamp-2 text-xs text-gray-600">{resolveSourcePreview(entry.agentSource)}</p>
                                <p className="mt-1 text-xs text-gray-400">{formatVersionTimestamp(entry.createdAt)}</p>
                            </button>
                        );
                    })}
                </div>
            </aside>

            <section className="min-h-0 rounded-xl border border-gray-200 bg-white">
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
                    <div>
                        <h2 className="text-sm font-semibold text-gray-900">
                            Version from {formatVersionTimestamp(selectedHistoryEntry.createdAt)}
                        </h2>
                        <p className="text-xs text-gray-500">
                            Hash <code>{selectedHistoryEntry.agentHash.slice(0, HASH_PREVIEW_LENGTH)}</code>
                            {' | '}
                            Engine {selectedHistoryEntry.promptbookEngineVersion}
                        </p>
                    </div>
                    <RestoreVersionButton
                        agentName={agentName}
                        historyId={selectedHistoryEntry.id}
                        className="bg-blue-600 text-white hover:bg-blue-500 border-blue-600 disabled:bg-blue-400"
                        label="Restore This Version"
                    />
                </header>

                <div className="h-[60dvh] overflow-auto p-4">
                    <pre className="whitespace-pre-wrap rounded-lg bg-gray-50 p-4 font-mono text-xs text-gray-800">
                        {selectedHistoryEntry.agentSource}
                    </pre>
                </div>
            </section>
        </div>
    );
}
