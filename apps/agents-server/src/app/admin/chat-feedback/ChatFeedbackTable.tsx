import { Card } from '../../../components/Homepage/Card';
import type { UseChatFeedbackState } from './useChatFeedbackState';

/**
 * Props for ChatFeedbackTable.
 */
type ChatFeedbackTableProps = Pick<
    UseChatFeedbackState,
    | 'items'
    | 'total'
    | 'loading'
    | 'error'
    | 'page'
    | 'pageSize'
    | 'totalPages'
    | 'sortOrder'
    | 'handleSortChange'
    | 'isSortedBy'
    | 'handleViewChat'
    | 'handleDeleteRow'
    | 'goToPreviousPage'
    | 'goToNextPage'
> & {
    /**
     * Active text formatter for agent naming.
     */
    formatText: (text: string) => string;
};

/**
 * Formats date.
 */
function formatDate(dateString: string | null | undefined): string {
    if (!dateString) return '-';

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;

    return date.toLocaleString();
}

/**
 * Gets text preview.
 */
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

/**
 * Renders the preview cell used in the chat feedback table.
 */
function ChatFeedbackPreviewCell({ value }: { value: unknown }) {
    return <div className="max-h-24 overflow-hidden overflow-ellipsis text-xs leading-snug">{getTextPreview(value)}</div>;
}

/**
 * Renders the feedback table and pagination for chat feedback.
 *
 * @private function of <ChatFeedbackClient/>
 */
export function ChatFeedbackTable({
    formatText,
    items,
    total,
    loading,
    error,
    page,
    pageSize,
    totalPages,
    sortOrder,
    handleSortChange,
    isSortedBy,
    handleViewChat,
    handleDeleteRow,
    goToPreviousPage,
    goToNextPage,
}: ChatFeedbackTableProps) {
    return (
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
                                        {formatText('Agent')}
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
                                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">{formatDate(row.createdAt)}</td>
                                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">{row.agentName}</td>
                                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">{row.rating || '-'}</td>
                                    <td className="max-w-xs px-4 py-3 text-gray-700">
                                        <ChatFeedbackPreviewCell value={row.textRating || '-'} />
                                    </td>
                                    <td className="max-w-xs px-4 py-3 text-gray-700">
                                        <ChatFeedbackPreviewCell value={row.userNote || '-'} />
                                    </td>
                                    <td className="max-w-xs px-4 py-3 text-gray-700">
                                        <ChatFeedbackPreviewCell value={row.expectedAnswer || '-'} />
                                    </td>
                                    <td className="max-w-xs px-4 py-3 text-gray-500">
                                        <div className="truncate text-xs">{row.url || '-'}</div>
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-gray-500">{row.ip || '-'}</td>
                                    <td className="whitespace-nowrap px-4 py-3 text-gray-500">{row.language || '-'}</td>
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
                            Showing <span className="font-semibold">{Math.min((page - 1) * pageSize + 1, total)}</span> –{' '}
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
                        onClick={goToPreviousPage}
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
                        onClick={goToNextPage}
                        disabled={page >= totalPages}
                        className="inline-flex items-center justify-center rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            </div>
        </Card>
    );
}
