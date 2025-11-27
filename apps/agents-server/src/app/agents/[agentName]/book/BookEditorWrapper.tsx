'use client';

import { BookEditor } from '@promptbook-local/components';
import { string_book } from '@promptbook-local/types';
import { useEffect, useRef, useState } from 'react';

type BookEditorWrapperProps = {
    agentName: string;
    agentSource: string_book;
    onAgentSourceChange: (source: string_book) => void;
};

// TODO: [🐱‍🚀] Rename to BookEditorSavingWrapper

export function BookEditorWrapper({ agentName, agentSource, onAgentSourceChange }: BookEditorWrapperProps) {
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    // Debounce timer ref so we can clear previous pending save
    const debounceTimerRef = useRef<number | null>(null);
    // Configurable debounce delay (ms) - tweak if needed
    const DEBOUNCE_DELAY = 1000;

    const performSave = async (sourceToSave: string_book) => {
        setSaveStatus('saving');
        try {
            const response = await fetch(`/agents/${encodeURIComponent(agentName)}/api/book`, {
                method: 'PUT',
                headers: { 'Content-Type': 'text/plain' },
                body: sourceToSave,
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

    const scheduleSave = (nextSource: string_book) => {
        // Clear existing pending save
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        // We stay 'idle' while typing; could add a 'pending' status in future if desired
        // Schedule new save
        debounceTimerRef.current = window.setTimeout(() => {
            performSave(nextSource);
        }, DEBOUNCE_DELAY);
    };

    const handleChange = (newSource: string_book) => {
        onAgentSourceChange(newSource);
        scheduleSave(newSource);
    };

    // Cleanup on unmount to avoid lingering timeouts
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    // Prevent browser close when not saved
    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (saveStatus === 'saving' || saveStatus === 'error') {
                event.preventDefault();
                event.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [saveStatus]);

    const savingIndicator = (
        <div className="text-sm text-gray-500">
            {saveStatus === 'saving' && '💾 Saving...'}
            {saveStatus === 'saved' && '✅ Saved'}
            {saveStatus === 'error' && '❌ Failed to save'}
        </div>
    );

    return (
        <div className="w-full h-full">
            <BookEditor
                className="w-full h-full"
                isBorderRadiusDisabled
                height={null}
                value={agentSource}
                onChange={handleChange}
                savingIndicator={savingIndicator}
                onFileUpload={async (file) => {
                    const formData = new FormData();
                    formData.append('file', file);

                    const response = await fetch('/api/upload', {
                        method: 'POST',
                        body: formData,
                    });

                    if (!response.ok) {
                        throw new Error(`Failed to upload file: ${response.statusText}`);
                    }

                    const { fileUrl: longFileUrl } = await response.json();

                    const LONG_URL = `${process.env.NEXT_PUBLIC_CDN_PUBLIC_URL!}/${process.env
                        .NEXT_PUBLIC_CDN_PATH_PREFIX!}/user/files/`;
                    const SHORT_URL = `https://ptbk.io/k/`;
                    // <- TODO: [🌍] Unite this logic in one place

                    const shortFileUrl = longFileUrl.split(LONG_URL).join(SHORT_URL);

                    console.log(`File uploaded:`, {
                        LONG_URL,
                        SHORT_URL,
                        longFileUrl,
                        shortFileUrl,
                        file,
                        formData,
                        response,
                    });

                    return shortFileUrl;
                }}
            />
        </div>
    );
}

/**
 * TODO: Prompt: Use `import { debounce } from '@promptbook-local/utils';` instead of custom debounce implementation
 * TODO: [🚗] Transfer the saving logic to `<BookEditor/>` be aware of CRDT / yjs approach to be implementable in future
 * TODO: [🐱‍🚀] Add error handling and retry logic
 * TODO: [🐱‍🚀] Show save status indicator
 */
