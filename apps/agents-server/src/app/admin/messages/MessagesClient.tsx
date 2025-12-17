'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '../../../components/Homepage/Card';
import {
    $fetchMessages,
    type MessageRow,
    type MessageSendAttemptRow,
} from '../../../utils/messagesAdmin';

function formatDate(dateString: string | null | undefined): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleString();
}

function getMessagePreview(content: string, maxLength = 120): string {
    if (!content) return '-';
    return content.length > maxLength ? `${content.slice(0, maxLength)}…` : content;
}

function getStatusBadge(attempts: MessageSendAttemptRow[] | undefined) {
    if (!attempts || attempts.length === 0) {
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">Pending</span>;
    }
    const success = attempts.find(a => a.isSuccessful);
    if (success) {
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Sent ({success.providerName})</span>;
    }
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">Failed ({attempts.length})</span>;
}

export function MessagesClient() {
    const [items, setItems] = useState<MessageRow[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [channel, setChannel] = useState('');
    const [direction, setDirection] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load messages whenever filters / pagination change
    useEffect(() => {
        let isCancelled = false;

        async function loadData() {
            try {
                setLoading(true);
                setError(null);

                const response = await $fetchMessages({
                    page,
                    pageSize,
                    search: search || undefined,
                    channel: channel || undefined,
                    direction: direction || undefined,
                });

                if (isCancelled) return;

                setItems(response.items);
                setTotal(response.total);
            } catch (err) {
                if (isCancelled) return;
                setError(err instanceof Error ? err.message : 'Failed to load messages');
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
    }, [page, pageSize, search, channel, direction]);

    const totalPages = useMemo(() => {
        if (total <= 0 || pageSize <= 0) return 1;
        return Math.max(1, Math.ceil(total / pageSize));
    }, [total, pageSize]);

    const handleSearchSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        setPage(1);
        setSearch(searchInput.trim());
    };

    const handlePageSizeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const next = parseInt(event.target.value, 10);
        if (!Number.isNaN(next) && next > 0) {
            setPageSize(next);
            setPage(1);
        }
    };

    const pagination = (
        <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-gray-100 pt-4 text-xs text-gray-600 md:flex-row">
            <div>
                {total > 0 ? (
                    <>
                        Showing <span className="font-semibold">{Math.min((page - 1) * pageSize + 1, total)}</span> –{' '}
                        <span className="font-semibold">{Math.min(page * pageSize, total)}</span> of{' '}
                        <span className="font-semibold">{total}</span> messages
                    </>
                ) : (
                    'No messages'
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
    );

    return (
        <div className="container mx-auto px-4 py-8 space-y-6">
            <div className="mt-20 mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-3xl text-gray-900 font-light">Messages</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Inspect all inbound and outbound messages and their statuses.
                    </p>
                </div>
                <div className="flex items-end gap-4 text-sm text-gray-500 md:text-right">
                    <div>
                        <div className="text-xl font-semibold text-gray-900">{total.toLocaleString()}</div>
                        <div className="text-xs uppercase tracking-wide text-gray-400">Total messages</div>
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
                                placeholder="Search in content..."
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
                            <label htmlFor="channelFilter" className="text-sm font-medium text-gray-700">
                                Channel
                            </label>
                            <select
                                id="channelFilter"
                                value={channel}
                                onChange={(e) => { setChannel(e.target.value); setPage(1); }}
                                className="w-full md:w-40 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All</option>
                                <option value="EMAIL">Email</option>
                                <option value="PROMPTBOOK_CHAT">Chat</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label htmlFor="directionFilter" className="text-sm font-medium text-gray-700">
                                Direction
                            </label>
                            <select
                                id="directionFilter"
                                value={direction}
                                onChange={(e) => { setDirection(e.target.value); setPage(1); }}
                                className="w-full md:w-40 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All</option>
                                <option value="INBOUND">Inbound</option>
                                <option value="OUTBOUND">Outbound</option>
                            </select>
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
            </Card>

            <Card>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium text-gray-900">Message list</h2>
                </div>
                {error && <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

                {loading && items.length === 0 ? (
                    <div className="py-8 text-center text-gray-500">Loading messages…</div>
                ) : items.length === 0 ? (
                    <div className="py-8 text-center text-gray-500">No messages found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium text-gray-500">Time</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-500">Channel</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-500">Direction</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-500">Sender/Recipients</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-500">Content</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {items.map((row) => (
                                    <tr key={row.id}>
                                        <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                                            {formatDate(row.createdAt)}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                                            {row.channel}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                                            {row.direction}
                                        </td>
                                        <td className="max-w-xs px-4 py-3 text-gray-700">
                                            <div className="truncate" title={JSON.stringify({ sender: row.sender, recipients: row.recipients }, null, 2)}>
                                                {/* Simple preview of sender/recipients */}
                                                S: {JSON.stringify(row.sender)}<br/>
                                                R: {JSON.stringify(row.recipients)}
                                            </div>
                                        </td>
                                        <td className="max-w-md px-4 py-3 text-gray-700">
                                            <div className="max-h-24 overflow-hidden overflow-ellipsis text-xs leading-snug">
                                                {getMessagePreview(row.content)}
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                                            {getStatusBadge(row.sendAttempts)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {pagination}
            </Card>
        </div>
    );
}
