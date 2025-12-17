'use client';

import { Chat } from '@promptbook-local/components';
import type { ChatMessage } from '@promptbook-local/types';
import { useEffect, useMemo, useState } from 'react';
import { Card } from '../../../components/Homepage/Card';
import {
    $clearAgentChatFeedback,
    $deleteChatFeedbackRow,
    $fetchChatFeedback,
    type ChatFeedbackRow,
    type ChatFeedbackSortField,
    type ChatFeedbackSortOrder,
} from '../../../utils/chatFeedbackAdmin';

type ChatFeedbackClientProps = {
    /**
     * Optional initial agent filter, taken from the URL query.
     */
    initialAgentName?: string;
};

type AdminAgentInfo = {
    agentName: string;
    fullname?: string | null;
};

type AgentsApiResponse = {
    agents: Array<{
        agentName: string;
        meta: { fullname?: string | null };
    }>;
};

function formatDate(dateString: string | null | undefined): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleString();
}

function getTextPreview(value: unknown, maxLength = 160): string {
    if (value == null) return '-';

    const text =
        typeof value === 'string'
            ? value
            : Array.isArray(value)
            ? value.map((part) => String(part)).join(' ')
            : typeof value === 'object'
            ? JSON.stringify(value)
            : String(value);

    return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

export function ChatFeedbackClient({ initialAgentName }: ChatFeedbackClientProps) {
    const [items, setItems] = useState<ChatFeedbackRow[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [agentName, setAgentName] = useState(initialAgentName ?? '');
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState<ChatFeedbackSortField>('createdAt');
    const [sortOrder, setSortOrder] = useState<ChatFeedbackSortOrder>('desc');
    const [selectedThread, setSelectedThread] = useState<ChatMessage[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [agents, setAgents] = useState<AdminAgentInfo[]>([]);
    const [agentsLoading, setAgentsLoading] = useState(false);

    // Load agents for filter dropdown
    useEffect(() => {
        let isCancelled = false;

        async function loadAgents() {
            try {
                setAgentsLoading(true);
                const response = await fetch('/api/agents');
                if (!response.ok) {
                    // If agents listing fails, we can still show chat feedback
                    return;
                }
                const data = (await response.json()) as AgentsApiResponse;

                if (isCancelled) return;

                const mappedAgents: AdminAgentInfo[] =
                    data.agents?.map((agent) => ({
                        agentName: agent.agentName,
                        fullname: agent.meta?.fullname ?? null,
                    })) ?? [];

                // Sort by display name
                mappedAgents.sort((a, b) => {
                    const nameA = (a.fullname || a.agentName).toLowerCase();
                    const nameB = (b.fullname || b.agentName).toLowerCase();
                    return nameA.localeCompare(nameB);
                });

                setAgents(mappedAgents);
            } finally {
                if (!isCancelled) {
                    setAgentsLoading(false);
                }
            }
        }

        loadAgents();

        return () => {
            isCancelled = true;
        };
    }, []);

    // Initial search input: we do not auto-search, but if initialAgentName is present we set it
    useEffect(() => {
        if (initialAgentName) {
            setAgentName(initialAgentName);
        }
    }, [initialAgentName]);

    // Load chat feedback whenever filters / pagination / sorting change
    useEffect(() => {
        let isCancelled = false;

        async function loadData() {
            try {
                setLoading(true);
                setError(null);

                const response = await $fetchChatFeedback({
                    page,
                    pageSize,
                    agentName: agentName || undefined,
                    search: search || undefined,
                    sortBy,
                    sortOrder,
                });

                if (isCancelled) return;

                setItems(response.items);
                setTotal(response.total);
            } catch (err) {
                if (isCancelled) return;
                setError(err instanceof Error ? err.message : 'Failed to load chat feedback');
            } finally {
                if (!isCancelled) {
                    setLoading(false);
                }
            }
        }

        loadData();

        return () => {
            isCancelled = true;
        };
    }, [page, pageSize, agentName, search, sortBy, sortOrder]);

    const totalPages = useMemo(() => {
        if (total <= 0 || pageSize <= 0) return 1;
        return Math.max(1, Math.ceil(total / pageSize));
    }, [total, pageSize]);

    const handleSearchSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        setPage(1);
        setSearch(searchInput.trim());
    };

    const handleAgentChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const value = event.target.value;
        setAgentName(value);
        setPage(1);
    };

    const handlePageSizeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const next = parseInt(event.target.value, 10);
        if (!Number.isNaN(next) && next > 0) {
            setPageSize(next);
            setPage(1);
        }
    };

    const handleSortChange = (field: ChatFeedbackSortField) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder(field === 'createdAt' ? 'desc' : 'asc');
        }
    };

    const handleViewChat = (row: ChatFeedbackRow) => {
        if (!row.chatThread) {
            alert('No chat thread available for this feedback.');
            return;
        }
        try {
            // Ensure dates are Date objects
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const thread = (row.chatThread as unknown as any[]).map((msg) => ({
                ...msg,
                date: msg.date ? new Date(msg.date) : msg.createdAt ? new Date(msg.createdAt) : undefined,
            })) satisfies Array<ChatMessage>;
            setSelectedThread(thread);
        } catch (e) {
            console.error('Failed to parse chat thread', e);
            alert('Failed to parse chat thread.');
        }
    };

    const handleDeleteRow = async (row: ChatFeedbackRow) => {
        if (!row.id) return;

        const confirmed = window.confirm('Are you sure you want to delete this feedback entry?');
        if (!confirmed) return;

        try {
            await $deleteChatFeedbackRow(row.id);
            // Reload current page
            const response = await $fetchChatFeedback({
                page,
                pageSize,
                agentName: agentName || undefined,
                search: search || undefined,
                sortBy,
                sortOrder,
            });
            setItems(response.items);
            setTotal(response.total);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete feedback entry');
        }
    };

    const handleClearAgentFeedback = async () => {
        if (!agentName) return;

        const confirmed = window.confirm(
            `Are you sure you want to permanently delete all feedback for agent "${agentName}"?`,
        );
        if (!confirmed) return;

        try {
            setLoading(true);
            setError(null);
            await $clearAgentChatFeedback(agentName);

            // After clearing, reload first page
            setPage(1);
            const response = await $fetchChatFeedback({
                page: 1,
                pageSize,
                agentName: agentName || undefined,
                search: search || undefined,
                sortBy,
                sortOrder,
            });
            setItems(response.items);
            setTotal(response.total);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to clear feedback');
        } finally {
            setLoading(false);
        }
    };

    const isSortedBy = (field: ChatFeedbackSortField) => sortBy === field;

    const getExportUrl = () => {
        const params = new URLSearchParams();
        if (agentName) {
            params.set('agentName', agentName);
        }
        return `/api/chat-feedback/export?${params.toString()}`;
    };

    return (
        <div className="container mx-auto px-4 py-8 space-y-6">
            <div className="mt-20 mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-3xl text-gray-900 font-light">Chat feedback</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Review and triage user feedback collected from your agents.
                    </p>
                </div>
                <div className="flex items-end gap-4 text-sm text-gray-500 md:text-right">
                    <div>
                        <a
                            href={getExportUrl()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            Download CSV
                        </a>
                    </div>
                    <div>
                        <div className="text-xl font-semibold text-gray-900">{total.toLocaleString()}</div>
                        <div className="text-xs uppercase tracking-wide text-gray-400">Total feedback entries</div>
                    </div>
                </div>
            </div>
            <Card>
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <form onSubmit={handleSearchSubmit} className="flex flex-col gap-2 md:flex-row md:items-end">
                        <div className="flex flex-col gap-1">
                            <label htmlFor="search" className="text-sm font-medium text-gray-700">
                                Search
                            </label>
                            <input
                                id="search"
                                type="text"
                                value={searchInput}
                                onChange={(event) => setSearchInput(event.target.value)}
                                placeholder="Search by agent, URL, IP, rating or note"
                                className="w-full md:w-72 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <button
                            type="submit"
                            className="mt-2 inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 md:mt-0 md:ml-3"
                        >
                            Apply
                        </button>
                    </form>

                    <div className="flex flex-col gap-2 md:flex-row md:items-end md:gap-4">
                        <div className="flex flex-col gap-1">
                            <label htmlFor="agentFilter" className="text-sm font-medium text-gray-700">
                                Agent filter
                            </label>
                            <select
                                id="agentFilter"
                                value={agentName}
                                onChange={handleAgentChange}
                                className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All agents</option>
                                {agents.map((agent) => (
                                    <option key={agent.agentName} value={agent.agentName}>
                                        {agent.fullname || agent.agentName}
                                    </option>
                                ))}
                            </select>
                            {agentsLoading && <span className="text-xs text-gray-400">Loading agents…</span>}
                        </div>

                        <div className="flex flex-col gap-1">
                            <label htmlFor="pageSize" className="text-sm font-medium text-gray-700">
                                Page size
                            </label>
                            <select
                                id="pageSize"
                                value={pageSize}
                                onChange={handlePageSizeChange}
                                className="w-28 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                    </div>
                </div>

                {agentName && (
                    <div className="mt-4 flex items-center justify-between gap-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
                        <p className="text-sm text-amber-800">
                            Showing feedback for agent <span className="font-semibold break-all">{agentName}</span>.
                        </p>
                        <button
                            type="button"
                            onClick={handleClearAgentFeedback}
                            className="inline-flex items-center justify-center rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                        >
                            Clear feedback for this agent
                        </button>
                    </div>
                )}
            </Card>

            <Card>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium text-gray-900">Feedback entries ({total})</h2>
                </div>
                {error && <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

                {loading && items.length === 0 ? (
                    <div className="py-8 text-center text-gray-500">Loading feedback…</div>
                ) : items.length === 0 ? (
                    <div className="py-8 text-center text-gray-500">No feedback found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium text-gray-500">
                                        <button
                                            type="button"
                                            onClick={() => handleSortChange('createdAt')}
                                            className="inline-flex items-center gap-1"
                                        >
                                            Time
                                            {isSortedBy('createdAt') && <span>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                                        </button>
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-500">
                                        <button
                                            type="button"
                                            onClick={() => handleSortChange('agentName')}
                                            className="inline-flex items-center gap-1"
                                        >
                                            Agent
                                            {isSortedBy('agentName') && <span>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                                        </button>
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-500">Rating</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-500">Text rating</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-500">User note</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-500">Expected answer</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-500">URL</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-500">IP</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-500">Language</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-500">Platform</th>
                                    <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {items.map((row) => (
                                    <tr key={row.id}>
                                        <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                                            {formatDate(row.createdAt)}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-gray-700">{row.agentName}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                                            {row.rating || '-'}
                                        </td>
                                        <td className="max-w-xs px-4 py-3 text-gray-700">
                                            <div className="max-h-24 overflow-hidden overflow-ellipsis text-xs leading-snug">
                                                {row.textRating ? getTextPreview(row.textRating) : '-'}
                                            </div>
                                        </td>
                                        <td className="max-w-xs px-4 py-3 text-gray-700">
                                            <div className="max-h-24 overflow-hidden overflow-ellipsis text-xs leading-snug">
                                                {row.userNote ? getTextPreview(row.userNote) : '-'}
                                            </div>
                                        </td>
                                        <td className="max-w-xs px-4 py-3 text-gray-700">
                                            <div className="max-h-24 overflow-hidden overflow-ellipsis text-xs leading-snug">
                                                {row.expectedAnswer ? getTextPreview(row.expectedAnswer) : '-'}
                                            </div>
                                        </td>
                                        <td className="max-w-xs px-4 py-3 text-gray-500">
                                            <div className="truncate text-xs">{row.url || '-'}</div>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-gray-500">{row.ip || '-'}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                                            {row.language || '-'}
                                        </td>
                                        <td className="max-w-xs px-4 py-3 text-gray-500">
                                            <div className="truncate text-xs">{row.platform || '-'}</div>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right text-xs font-medium space-x-2">
                                            {row.chatThread && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleViewChat(row)}
                                                    className="text-blue-600 hover:text-blue-800"
                                                >
                                                    View Chat
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteRow(row)}
                                                className="text-red-600 hover:text-red-800"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-gray-100 pt-4 text-xs text-gray-600 md:flex-row">
                    <div>
                        {total > 0 ? (
                            <>
                                Showing{' '}
                                <span className="font-semibold">{Math.min((page - 1) * pageSize + 1, total)}</span> –{' '}
                                <span className="font-semibold">{Math.min(page * pageSize, total)}</span> of{' '}
                                <span className="font-semibold">{total}</span> feedback entries
                            </>
                        ) : (
                            'No feedback'
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                            disabled={page <= 1}
                            className="inline-flex items-center justify-center rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <span>
                            Page <span className="font-semibold">{page}</span> of{' '}
                            <span className="font-semibold">{totalPages}</span>
                        </span>
                        <button
                            type="button"
                            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                            disabled={page >= totalPages}
                            className="inline-flex items-center justify-center rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </Card>

            {selectedThread && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
                        <div className="flex justify-between items-center p-4 border-b border-gray-200">
                            <h3 className="text-lg font-medium text-gray-900">Chat Thread</h3>
                            <button
                                onClick={() => setSelectedThread(null)}
                                className="text-gray-400 hover:text-gray-500"
                            >
                                <span className="sr-only">Close</span>
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-hidden relative">
                            <Chat messages={selectedThread} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
