'use client';

import { Loader2, RefreshCcw, Search, Tag } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ServerLanguageCode } from '../../../languages/ServerLanguageRegistry';
import { formatServerLanguageHumanReadableDate } from '../../../utils/localization/formatServerLanguageHumanReadableDate';

/**
 * One commit candidate returned from the custom-target picker API.
 */
export type CustomCommitPickerCandidate = {
    readonly commitSha: string;
    readonly shortCommitSha: string;
    readonly subject: string;
    readonly authorName: string;
    readonly authorEmail: string;
    readonly authoredAt: string;
    readonly branches: ReadonlyArray<string>;
    readonly tags: ReadonlyArray<string>;
    readonly isReleaseTag: boolean;
};

/**
 * Props for the standalone-VPS self-update custom commit picker.
 *
 * @private internal component of `<UpdateClient/>`
 */
type CustomCommitPickerProps = {
    readonly language: ServerLanguageCode;
    readonly selectedRef: string;
    readonly onSelectRef: (nextRef: string, matchedCandidate: CustomCommitPickerCandidate | null) => void;
    readonly isDisabled: boolean;
};

/**
 * Debounce delay (ms) applied between filter input and the candidate list refresh.
 */
const SEARCH_DEBOUNCE_MILLISECONDS = 300;

/**
 * Maximum number of commits the picker requests from the server at once.
 */
const COMMIT_PICKER_LIMIT = 200;

/**
 * Lets the super admin pick an arbitrary commit, tag, or branch for the standalone VPS self-update.
 *
 * @private internal component of `<UpdateClient/>`
 */
export function CustomCommitPicker({ language, selectedRef, onSelectRef, isDisabled }: CustomCommitPickerProps) {
    const [searchText, setSearchText] = useState<string>('');
    const [authoredAfter, setAuthoredAfter] = useState<string>('');
    const [authoredBefore, setAuthoredBefore] = useState<string>('');
    const [candidates, setCandidates] = useState<ReadonlyArray<CustomCommitPickerCandidate>>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);
    const debounceTimeoutRef = useRef<number | null>(null);

    const loadCandidates = useCallback(async (): Promise<void> => {
        try {
            setIsLoading(true);
            setLoadErrorMessage(null);

            const searchParams = new URLSearchParams();
            if (searchText.trim()) {
                searchParams.set('search', searchText.trim());
            }
            if (authoredAfter) {
                searchParams.set('after', authoredAfter);
            }
            if (authoredBefore) {
                searchParams.set('before', authoredBefore);
            }
            searchParams.set('limit', String(COMMIT_PICKER_LIMIT));

            const response = await fetch(`/api/admin/update/commits?${searchParams.toString()}`, {
                cache: 'no-store',
            });
            const payload = (await response.json()) as {
                readonly commits?: ReadonlyArray<CustomCommitPickerCandidate>;
                readonly error?: string;
            };
            if (!response.ok) {
                throw new Error(payload.error || 'Failed to load candidate commits.');
            }

            setCandidates(payload.commits ?? []);
        } catch (error) {
            setLoadErrorMessage(error instanceof Error ? error.message : 'Failed to load candidate commits.');
            setCandidates([]);
        } finally {
            setIsLoading(false);
        }
    }, [authoredAfter, authoredBefore, searchText]);

    useEffect(() => {
        if (debounceTimeoutRef.current !== null) {
            window.clearTimeout(debounceTimeoutRef.current);
        }
        debounceTimeoutRef.current = window.setTimeout(() => {
            void loadCandidates();
        }, SEARCH_DEBOUNCE_MILLISECONDS);

        return () => {
            if (debounceTimeoutRef.current !== null) {
                window.clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, [loadCandidates]);

    const normalizedSelectedRef = selectedRef.trim().toLowerCase();
    const matchingCandidate = useMemo(
        () =>
            candidates.find(
                (candidate) =>
                    candidate.commitSha.toLowerCase().startsWith(normalizedSelectedRef) ||
                    candidate.tags.some((tag) => tag.toLowerCase() === normalizedSelectedRef) ||
                    candidate.branches.some((branch) => branch.toLowerCase() === normalizedSelectedRef),
            ) ?? null,
        [candidates, normalizedSelectedRef],
    );

    return (
        <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
                <label className="relative block">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="search"
                        value={searchText}
                        onChange={(event) => setSearchText(event.target.value)}
                        disabled={isDisabled}
                        placeholder="Search by hash, message, author, branch, tag..."
                        className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                </label>
                <input
                    type="date"
                    value={authoredAfter}
                    onChange={(event) => setAuthoredAfter(event.target.value)}
                    disabled={isDisabled}
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                    title="Authored after"
                />
                <input
                    type="date"
                    value={authoredBefore}
                    onChange={(event) => setAuthoredBefore(event.target.value)}
                    disabled={isDisabled}
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                    title="Authored before"
                />
            </div>

            <div className="flex items-center justify-between gap-3">
                <label className="flex-1 text-xs text-slate-500">
                    <span className="block font-semibold uppercase tracking-wide">Or paste a ref directly</span>
                    <input
                        type="text"
                        value={selectedRef}
                        onChange={(event) => onSelectRef(event.target.value, null)}
                        disabled={isDisabled}
                        placeholder="commit hash, tag name, or branch name"
                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                </label>
                <button
                    type="button"
                    onClick={() => void loadCandidates()}
                    disabled={isDisabled || isLoading}
                    className="self-end inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <RefreshCcw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {loadErrorMessage && (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                    {loadErrorMessage}
                </div>
            )}

            <div className="max-h-96 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                {isLoading && candidates.length === 0 ? (
                    <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading candidate commits...
                    </div>
                ) : candidates.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-slate-500">
                        No commits match the current filter.
                    </div>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {candidates.map((candidate) => {
                            const isSelected = candidate === matchingCandidate;
                            const authoredAtLabel = formatServerLanguageHumanReadableDate(
                                candidate.authoredAt,
                                language,
                                {
                                    isExactDateIncluded: true,
                                },
                            );

                            return (
                                <li key={candidate.commitSha}>
                                    <button
                                        type="button"
                                        onClick={() => onSelectRef(candidate.commitSha, candidate)}
                                        disabled={isDisabled}
                                        className={`w-full px-4 py-3 text-left transition ${
                                            isSelected
                                                ? 'bg-blue-50 ring-1 ring-inset ring-blue-300'
                                                : 'hover:bg-slate-50'
                                        } disabled:cursor-not-allowed disabled:opacity-60`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs text-slate-500">
                                                {candidate.shortCommitSha}
                                            </span>
                                            {candidate.isReleaseTag && (
                                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                                                    <Tag className="h-3 w-3" />
                                                    Release
                                                </span>
                                            )}
                                            {candidate.tags.map((tag) => (
                                                <span
                                                    key={`tag-${tag}`}
                                                    className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-mono text-amber-800"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                            {candidate.branches.map((branch) => (
                                                <span
                                                    key={`branch-${branch}`}
                                                    className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-mono text-sky-800"
                                                >
                                                    {branch}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="mt-1 truncate text-sm text-slate-900">{candidate.subject}</div>
                                        <div className="mt-0.5 text-xs text-slate-500">
                                            {candidate.authorName} - {authoredAtLabel}
                                        </div>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}
