'use client';

import { BookEditor } from '@promptbook-local/components';
import { string_book } from '@promptbook-local/types';
import { upload } from '@vercel/blob/client';
import { useEffect, useRef, useState } from 'react';

type BookEditorWrapperProps = {
    agentName: string;
    initialAgentSource: string_book;
};

// TODO: [🐱‍🚀] Rename to BookEditorSavingWrapper

export function BookEditorWrapper({ agentName, initialAgentSource }: BookEditorWrapperProps) {
    const [agentSource, setAgentSource] = useState<string_book>(initialAgentSource);
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
        setAgentSource(newSource);
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

    return (
        <div className="w-full h-full">
            {saveStatus !== 'idle' && (
                <div
                    role="status"
                    aria-live="polite"
                    className={`fixed top-5 right-28 z-50 px-4 py-2 text-sm rounded shadow-md ${
                        saveStatus === 'saving'
                            ? 'bg-blue-100 text-blue-800'
                            : saveStatus === 'saved'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                    }`}
                >
                    {saveStatus === 'saving' && '💾 Saving...'}
                    {saveStatus === 'saved' && '✅ Saved'}
                    {saveStatus === 'error' && '❌ Failed to save'}
                </div>
            )}

            <BookEditor
                className="w-full h-full"
                isBorderRadiusDisabled
                height={null}
                value={agentSource}
                onChange={handleChange}
                onFileUpload={async (file, onProgress) => {
                    console.info('🔼 Uploading file', file);

                    // Build the full path including prefix and user/files directory
                    const pathPrefix = process.env.NEXT_PUBLIC_CDN_PATH_PREFIX || '';
                    const uploadPath = pathPrefix ? `${pathPrefix}/user/files/${file.name}` : `user/files/${file.name}`;

                    // Upload directly to Vercel Blob using client upload
                    const blob = await upload(uploadPath, file, {
                        access: 'public',
                        handleUploadUrl: '/api/upload',
                        clientPayload: JSON.stringify({
                            purpose: 'KNOWLEDGE',
                            contentType: file.type,
                        }),
                        onUploadProgress: (progressEvent) => {
                            if (onProgress) {
                                onProgress(progressEvent.percentage / 100);
                            }
                        },
                    });

                    const fileUrl = blob.url;

                    const LONG_URL = `${process.env.NEXT_PUBLIC_CDN_PUBLIC_URL!}/${process.env
                        .NEXT_PUBLIC_CDN_PATH_PREFIX!}/user/files/`;
                    const SHORT_URL = `https://ptbk.io/k/`;
                    // <- TODO: [🌍] Unite this logic in one place

                    const shortFileUrl = fileUrl.split(LONG_URL).join(SHORT_URL);

                    console.log(`🔼 File uploaded:`, {
                        LONG_URL,
                        SHORT_URL,
                        fileUrl,
                        shortFileUrl,
                        file,
                        blob,
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
