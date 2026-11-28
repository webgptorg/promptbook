import type { ChatMessage } from '@promptbook-local/types';
import { Chat } from '../../../../../../src/book-components/Chat/Chat/Chat';
import { usePromptbookTheme } from '../../../components/ThemeMode/usePromptbookTheme';

/**
 * Props for ChatFeedbackThreadDialog.
 */
type ChatFeedbackThreadDialogProps = {
    /**
     * Currently selected chat thread.
     */
    selectedThread: ChatMessage[] | null;
    /**
     * Closes the dialog.
     */
    onClose: () => void;
};

/**
 * Renders the chat-thread dialog for chat feedback.
 *
 * @private function of <ChatFeedbackClient/>
 */
export function ChatFeedbackThreadDialog({ selectedThread, onClose }: ChatFeedbackThreadDialogProps) {
    const { promptbookTheme } = usePromptbookTheme();

    if (!selectedThread) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div className="flex h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-950">
                <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-slate-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">Chat Thread</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 transition-colors hover:text-gray-500 dark:text-slate-400 dark:hover:text-slate-200"
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
                    <Chat messages={selectedThread} layout="STANDALONE" theme={promptbookTheme} />
                </div>
            </div>
        </div>
    );
}
