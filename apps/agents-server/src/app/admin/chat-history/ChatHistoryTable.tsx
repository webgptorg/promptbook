import Link from 'next/link';
import { Card } from '../../../components/Homepage/Card';
import type { ServerLanguageCode } from '../../../languages/ServerLanguageRegistry';
import { formatServerLanguageHumanReadableDate } from '../../../utils/localization/formatServerLanguageHumanReadableDate';
import { AdminSortableTableHeaderCell } from '../_components/AdminSortableTableHeaderCell';
import { ChatHistoryPagination } from './ChatHistoryPagination';
import type { UseChatHistoryState } from './useChatHistoryState';

/**
 * Props for ChatHistoryTable.
 */
type ChatHistoryTableProps = Pick<
    UseChatHistoryState,
    | 'items'
    | 'total'
    | 'loading'
    | 'error'
    | 'page'
    | 'pageSize'
    | 'totalPages'
    | 'sortBy'
    | 'sortOrder'
    | 'handleSortChange'
    | 'handleDeleteRow'
    | 'handleCreateMockFromRow'
    | 'isCreatingMock'
    | 'goToPreviousPage'
    | 'goToNextPage'
> & {
    /**
     * Active text formatter for agent naming.
     */
    formatText: (text: string) => string;

    /**
     * Active UI language used for date formatting.
     */
    language: ServerLanguageCode;
};

/**
 * Formats date.
 */
function formatDate(dateString: string | null | undefined, language: ServerLanguageCode): string {
    return formatServerLanguageHumanReadableDate(dateString, language, { fallbackLabel: '-' });
}

/**
 * Gets message role.
 */
function getMessageRole(message: unknown): string {
    if (!message || typeof message !== 'object') return '-';

    const role = (message as { role?: string }).role;
    return role || '-';
}

/**
 * Gets message preview.
 */
function getMessagePreview(message: unknown, maxLength = 120): string {
    if (message == null) return '-';

    if (typeof message === 'string') {
        return message.length > maxLength ? `${message.slice(0, maxLength)}…` : message;
    }

    if (typeof message === 'object') {
        const content = (message as { content?: unknown }).content ?? (message as { text?: unknown }).text ?? message;

        let text: string;

        if (typeof content === 'string') {
            text = content;
        } else if (Array.isArray(content)) {
            text = content.map((part) => String(part)).join(' ');
        } else {
            text = JSON.stringify(content);
        }

        return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
    }

    return String(message);
}

/**
 * Renders the preview cell used in the chat history table.
 */
function ChatHistoryPreviewCell({ message }: { message: unknown }) {
    return <div className="max-h-24 overflow-hidden overflow-ellipsis text-xs leading-snug">{getMessagePreview(message)}</div>;
}

/**
 * Renders the table and pagination for chat history.
 *
 * @private function of <ChatHistoryClient/>
 */
export function ChatHistoryTable({
    formatText,
    language,
    items,
    total,
    loading,
    error,
    page,
    pageSize,
    totalPages,
    sortBy,
    sortOrder,
    handleSortChange,
    handleDeleteRow,
    handleCreateMockFromRow,
    isCreatingMock,
    goToPreviousPage,
    goToNextPage,
}: ChatHistoryTableProps) {
    return (
        <Card>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">Messages ({total})</h2>
            </div>
            {error && <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

            {loading && items.length === 0 ? (
                <div className="py-8 text-center text-gray-500">Loading chat history…</div>
            ) : items.length === 0 ? (
                <div className="py-8 text-center text-gray-500">No chat history found.</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <AdminSortableTableHeaderCell
                                    className="px-4 py-3 text-left font-medium text-gray-500"
                                    label="time"
                                    sortBy="createdAt"
                                    activeSortBy={sortBy}
                                    sortOrder={sortOrder}
                                    onSortChange={handleSortChange}
                                >
                                    Time
                                </AdminSortableTableHeaderCell>
                                <AdminSortableTableHeaderCell
                                    className="px-4 py-3 text-left font-medium text-gray-500"
                                    label={formatText('Agent')}
                                    sortBy="agentName"
                                    activeSortBy={sortBy}
                                    sortOrder={sortOrder}
                                    onSortChange={handleSortChange}
                                >
                                    {formatText('Agent')}
                                </AdminSortableTableHeaderCell>
                                <th className="px-4 py-3 text-left font-medium text-gray-500">Role</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-500">Message</th>
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
                                        {formatDate(row.createdAt, language)}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">{row.agentName}</td>
                                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">{getMessageRole(row.message)}</td>
                                    <td className="max-w-xs px-4 py-3 text-gray-700">
                                        <ChatHistoryPreviewCell message={row.message} />
                                    </td>
                                    <td className="max-w-xs px-4 py-3 text-gray-500">
                                        <div className="truncate text-xs">{row.url || '-'}</div>
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-gray-500">{row.ip || '-'}</td>
                                    <td className="whitespace-nowrap px-4 py-3 text-gray-500">{row.language || '-'}</td>
                                    <td className="max-w-xs px-4 py-3 text-gray-500">
                                        <div className="truncate text-xs">{row.platform || '-'}</div>
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-right text-xs font-medium">
                                        <div className="flex items-center justify-end gap-3">
                                            <button
                                                type="button"
                                                onClick={() => void handleCreateMockFromRow(row)}
                                                disabled={isCreatingMock}
                                                className="text-blue-600 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                                                title="Create a mocked chat preset from this chat"
                                            >
                                                Create mock
                                            </button>
                                            {row.taskId ? (
                                                <Link
                                                    href={`/admin/task-manager/${encodeURIComponent(row.taskId)}`}
                                                    className="text-blue-600 hover:text-blue-800"
                                                    title="Open the chat completion task of this message"
                                                >
                                                    Task
                                                </Link>
                                            ) : null}
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteRow(row)}
                                                className="text-red-600 hover:text-red-800"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <ChatHistoryPagination
                total={total}
                page={page}
                pageSize={pageSize}
                totalPages={totalPages}
                goToPreviousPage={goToPreviousPage}
                goToNextPage={goToNextPage}
            />
        </Card>
    );
}
