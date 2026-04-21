import type { ChatMessage } from '@promptbook-local/types';
import { Chat } from '../../../../../../src/book-components/Chat/Chat/Chat';

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
    if (!selectedThread) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Chat Thread</h3>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-500">
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
                    <Chat messages={selectedThread} layout="STANDALONE" />
                </div>
            </div>
        </div>
    );
}
