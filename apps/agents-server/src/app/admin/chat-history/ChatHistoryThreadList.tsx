import type { ServerLanguageCode } from '../../../languages/ServerLanguageRegistry';
import { formatServerLanguageHumanReadableDate } from '../../../utils/localization/formatServerLanguageHumanReadableDate';
import type { UseChatHistoryState } from './useChatHistoryState';

/**
 * Props for ChatHistoryThreadList.
 */
type ChatHistoryThreadListProps = Pick<UseChatHistoryState, 'threads' | 'threadsLoading' | 'handleChatThreadChange'> & {
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
 * Renders the selectable list of recorded chat threads shown in the chat view
 * before a single conversation is opened, so threads are never mixed together.
 *
 * @private function of <ChatHistoryChatView/>
 */
export function ChatHistoryThreadList({
    threads,
    threadsLoading,
    handleChatThreadChange,
    formatText,
    language,
}: ChatHistoryThreadListProps) {
    if (threadsLoading && threads.length === 0) {
        return <div className="py-12 text-center text-gray-500">Loading chat threads…</div>;
    }

    if (threads.length === 0) {
        return <div className="py-12 text-center text-gray-500">No chat threads found.</div>;
    }

    return (
        <div className="divide-y divide-gray-100">
            <div className="px-4 py-3 text-xs uppercase tracking-wide text-gray-400">
                {formatText('Select a chat thread to view the conversation')}
            </div>
            {threads.map((thread) => (
                <button
                    key={thread.chatId}
                    type="button"
                    onClick={() => handleChatThreadChange(thread.chatId)}
                    className="flex w-full flex-col gap-1 px-4 py-3 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                >
                    <span className="truncate text-sm font-medium text-gray-900">{thread.title}</span>
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                        <span className="font-medium text-gray-600">{thread.agentName}</span>
                        <span>
                            {thread.messageCount} {thread.messageCount === 1 ? 'message' : 'messages'}
                        </span>
                        <span>
                            {formatServerLanguageHumanReadableDate(thread.lastMessageAt, language, { fallbackLabel: '-' })}
                        </span>
                    </span>
                </button>
            ))}
        </div>
    );
}
