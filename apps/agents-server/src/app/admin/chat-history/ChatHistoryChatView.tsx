import { MockedChat } from '@promptbook-local/components';
import { CHAT_VISUAL_MODES } from '../../../constants/chatVisualMode';
import type { ServerLanguageCode } from '../../../languages/ServerLanguageRegistry';
import { ChatHistoryPagination } from './ChatHistoryPagination';
import { ChatHistoryThreadList } from './ChatHistoryThreadList';
import type { UseChatHistoryState } from './useChatHistoryState';

/**
 * Props for ChatHistoryChatView.
 */
type ChatHistoryChatViewProps = Pick<
    UseChatHistoryState,
    | 'chatId'
    | 'selectedThread'
    | 'chatMessages'
    | 'threads'
    | 'threadsLoading'
    | 'handleChatThreadChange'
    | 'handleCreateMockFromChatView'
    | 'isCreatingMock'
    | 'total'
    | 'page'
    | 'pageSize'
    | 'totalPages'
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
 * Renders the chat transcript view of the admin chat history.
 *
 * When no chat thread is selected it shows the list of recorded threads; once a
 * thread is opened it renders that single conversation as a chat. The transcript
 * is always shown in bubble mode so recorded chats stay readable regardless of the
 * article-mode control-panel preference, and threads are never mixed together.
 *
 * @private function of <ChatHistoryClient/>
 */
export function ChatHistoryChatView({
    chatId,
    selectedThread,
    chatMessages,
    threads,
    threadsLoading,
    handleChatThreadChange,
    handleCreateMockFromChatView,
    isCreatingMock,
    total,
    page,
    pageSize,
    totalPages,
    goToPreviousPage,
    goToNextPage,
    formatText,
    language,
}: ChatHistoryChatViewProps) {
    if (!chatId) {
        return (
            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                <ChatHistoryThreadList
                    threads={threads}
                    threadsLoading={threadsLoading}
                    handleChatThreadChange={handleChatThreadChange}
                    formatText={formatText}
                    language={language}
                />
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 p-3">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => handleChatThreadChange('')}
                        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                        title="Back to the list of chat threads"
                    >
                        ← All threads
                    </button>
                    <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-gray-900">
                            {selectedThread?.title || 'Recorded chat'}
                        </div>
                        {selectedThread && (
                            <div className="truncate text-xs text-gray-500">{selectedThread.agentName}</div>
                        )}
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => void handleCreateMockFromChatView()}
                    disabled={isCreatingMock}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                    title="Create a mocked chat preset from the shown messages"
                >
                    {isCreatingMock ? 'Creating mock…' : 'Create mock'}
                </button>
            </div>
            <div className="h-[800px] relative">
                <MockedChat
                    messages={chatMessages}
                    isPausable={true}
                    isResettable={false}
                    isSaveButtonEnabled={true}
                    layout="STANDALONE"
                    visualMode={CHAT_VISUAL_MODES.BUBBLE_MODE}
                />
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-200">
                <ChatHistoryPagination
                    total={total}
                    page={page}
                    pageSize={pageSize}
                    totalPages={totalPages}
                    goToPreviousPage={goToPreviousPage}
                    goToNextPage={goToNextPage}
                />
            </div>
        </div>
    );
}
