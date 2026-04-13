import type { UseChatHistoryState } from './useChatHistoryState';

/**
 * Props for ChatHistoryPagination.
 */
type ChatHistoryPaginationProps = Pick<
    UseChatHistoryState,
    'total' | 'page' | 'pageSize' | 'totalPages' | 'goToPreviousPage' | 'goToNextPage'
>;

/**
 * Renders pagination controls for the chat history admin views.
 *
 * @private function of <ChatHistoryClient/>
 */
export function ChatHistoryPagination({
    total,
    page,
    pageSize,
    totalPages,
    goToPreviousPage,
    goToNextPage,
}: ChatHistoryPaginationProps) {
    return (
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
                    onClick={goToPreviousPage}
                    disabled={page <= 1}
                    className="inline-flex items-center justify-center rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Previous
                </button>
                <span>
                    Page <span className="font-semibold">{page}</span> of <span className="font-semibold">{totalPages}</span>
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
    );
}
