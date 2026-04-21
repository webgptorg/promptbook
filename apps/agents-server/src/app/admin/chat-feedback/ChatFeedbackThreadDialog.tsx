import type { ChatMessage } from '@promptbook-local/types';
import { XIcon } from 'lucide-react';
import { Dialog } from '../../../components/Portal/Dialog';
import { ThemedChat } from '../../../components/ThemePreferences/ThemedChat';

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
        <Dialog onClose={onClose} className="flex h-[min(80vh,60rem)] w-full max-w-4xl flex-col overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                <h3 className="text-lg font-medium text-gray-900">Chat Thread</h3>
                <button type="button" onClick={onClose} className="text-gray-400 transition-colors hover:text-gray-500">
                    <span className="sr-only">Close</span>
                    <XIcon className="h-5 w-5" />
                </button>
            </div>
            <div className="relative flex-1 overflow-hidden">
                <ThemedChat className="h-full w-full" messages={selectedThread} layout="STANDALONE" />
            </div>
        </Dialog>
    );
}
