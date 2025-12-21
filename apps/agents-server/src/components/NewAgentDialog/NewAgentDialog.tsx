'use client';

import { string_book } from '@promptbook-local/types';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BookEditor } from '../../../../../src/book-components/BookEditor/BookEditor';
import { Portal } from '../Portal/Portal';

type NewAgentDialogProps = {
    isOpen: boolean;
    onClose: () => void;
    initialAgentSource: string_book;
    onCreate: (agentSource: string_book) => Promise<void>;
};

export function NewAgentDialog(props: NewAgentDialogProps) {
    const { isOpen, onClose, initialAgentSource, onCreate } = props;
    const [agentSource, setAgentSource] = useState(initialAgentSource);
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        setAgentSource(initialAgentSource);
    }, [initialAgentSource]);

    if (!isOpen) {
        return null;
    }

    const handleCreate = async () => {
        setIsCreating(true);
        try {
            await onCreate(agentSource);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <Portal>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="relative w-full max-w-4xl h-[80vh] bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col animate-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between p-4 border-b border-gray-200">
                        <h2 className="text-xl font-semibold text-gray-900">Create New Agent</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-500 transition-colors"
                        >
                            <X className="w-5 h-5" />
                            <span className="sr-only">Close</span>
                        </button>
                    </div>

                    <div className="flex-1 overflow-hidden p-4">
                        <BookEditor
                            agentSource={agentSource}
                            onChange={(source) => setAgentSource(source)}
                            height="100%"
                            isVerbose={false}
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCreate}
                            disabled={isCreating}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isCreating ? (
                                <>
                                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    Creating...
                                </>
                            ) : (
                                'Create Agent'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </Portal>
    );
}
