'use client';

import { BookEditor } from '@promptbook-local/components';
import { string_book } from '@promptbook-local/types';
import { useState } from 'react';

type BookEditorWrapperProps = {
    agentName: string;
    initialAgentSource: string_book;
};

// TODO: !!!! Rename to BookEditorSavingWrapper

export function BookEditorWrapper({ agentName, initialAgentSource }: BookEditorWrapperProps) {
    const [agentSource, setAgentSource] = useState<string_book>(initialAgentSource);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    const handleChange = async (newSource: string_book) => {
        setAgentSource(newSource);
        setSaveStatus('saving');

        try {
            const response = await fetch(`/agents/${encodeURIComponent(agentName)}/api/book`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'text/plain',
                },
                body: newSource,
            });

            if (!response.ok) {
                throw new Error(`Failed to save: ${response.statusText}`);
            }

            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000); // Reset status after 2 seconds
        } catch (error) {
            console.error('Error saving agent source:', error);
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 3000);
        }
    };

    return (
        <div className="w-full h-screen flex flex-col">
            {saveStatus !== 'idle' && (
                <div
                    className={`px-4 py-2 text-sm ${
                        saveStatus === 'saving'
                            ? 'bg-blue-100 text-blue-800'
                            : saveStatus === 'saved'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                    }`}
                >
                    {saveStatus === 'saving' && '💾 Saving...'}
                    {saveStatus === 'saved' && '✅ Saved successfully'}
                    {saveStatus === 'error' && '❌ Failed to save'}
                </div>
            )}
            <div className="flex-1">
                <BookEditor value={agentSource} onChange={handleChange} />
            </div>
        </div>
    );
}

/**
 * TODO: [🚗] Transfer the saving logic to `<BookEditor/>` be aware of CRDT / yjs approach to be implementable in future
 * TODO: !!! Implement debouncing for auto-save
 * TODO: !!! Add error handling and retry logic
 * TODO: !!! Show save status indicator
 * TODO: !!!!! Add file upload capability
 */
