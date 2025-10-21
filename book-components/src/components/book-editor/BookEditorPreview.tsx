'use client';

import { BookEditor } from '@promptbook-local/components';
import {
    createAgentModelRequirements,
    DEFAULT_BOOK,
    getAllCommitmentDefinitions,
    parseAgentSource,
} from '@promptbook-local/core';
import type { AgentModelRequirements, string_book } from '@promptbook-local/types';
import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { forTime } from 'waitasecond';
import styles from './BookEditorPreview.module.css';

/**
 * Renders a preview of `<BookEditor />` component.
 */
export default function BookEditorPreview() {
    const [book, setBook] = useState<string_book>(DEFAULT_BOOK);

    // --- Sample selector state ---
    const [samples, setSamples] = useState<{ name: string; content: string }[]>([]);
    const [isLoadingSamples, setIsLoadingSamples] = useState(false);

    // Load samples from API (/books and /books/{bookId})
    useEffect(() => {
        setIsLoadingSamples(true);
        async function loadSamples() {
            try {
                // 1. Fetch list of book IDs
                const res = await fetch('/api/books');
                if (!res.ok) throw new Error('Failed to fetch book list');
                const bookIds: string[] = await res.json();

                // 2. Fetch each book's content in parallel
                const samplePromises = bookIds.map(async (bookId) => {
                    const contentRes = await fetch(`/api/books/${encodeURIComponent(bookId)}`);
                    if (!contentRes.ok) return null;
                    const content = await contentRes.text();
                    return { name: bookId, content };
                });
                const loadedSamples = (await Promise.all(samplePromises)).filter(Boolean) as {
                    name: string;
                    content: string;
                }[];
                setSamples(loadedSamples);
            } catch (error) {
                console.error('Error loading book samples:', error);
                setSamples([]);
            } finally {
                setIsLoadingSamples(false);
            }
        }
        loadSamples();
    }, []);

    // Confirmation dialog state
    const [pendingSample, setPendingSample] = useState<{ name: string; content: string } | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);

    function handleSamplePick(sample: { name: string; content: string }) {
        if (book.trim() !== '' && book !== DEFAULT_BOOK) {
            setPendingSample(sample);
            setShowConfirm(true);
        } else {
            setBook(sample.content as string_book);
        }
    }

    function confirmReplace() {
        if (pendingSample) setBook(pendingSample.content as string_book);
        setShowConfirm(false);
        setPendingSample(null);
    }

    function cancelReplace() {
        setShowConfirm(false);
        setPendingSample(null);
    }
    const [modelRequirements, setModelRequirements] = useState<AgentModelRequirements | null>(null);
    const [isCreatingModelRequirements, setIsCreatingModelRequirements] = useState(false);

    const bookParsed = useMemo(() => {
        return parseAgentSource(book);
    }, [book]);

    // Commitment definitions manual (navigable)
    const definitions = useMemo(() => getAllCommitmentDefinitions(), []);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const selected = definitions[selectedIndex];

    const handleCreateModelRequirements = async () => {
        setIsCreatingModelRequirements(true);
        try {
            await forTime(300); // <- Note: Add small delay to show "Creating..." state
            const requirements = await createAgentModelRequirements(book);
            setModelRequirements(requirements);
        } catch (error) {
            console.error('Error creating model requirements:', error);
            alert('Error creating model requirements. See console for details.');
        } finally {
            setIsCreatingModelRequirements(false);
        }
    };

    return (
        <div className={`w-full`}>
            {/* Sample selector */}
            <div className="mb-4">
                <label className="block mb-1 font-medium">Load Book Sample:</label>
                <select
                    disabled={isLoadingSamples || samples.length === 0}
                    onChange={(e) => {
                        const idx = Number(e.target.value);
                        if (!isNaN(idx) && samples[idx]) {
                            handleSamplePick(samples[idx]);
                        }
                    }}
                    value=""
                    className="border rounded px-2 py-1"
                >
                    <option value="" disabled>
                        {isLoadingSamples ? 'Loading samples...' : 'Select a sample'}
                    </option>
                    {samples.map((s, i) => (
                        <option value={i} key={s.name}>
                            {s.name}
                        </option>
                    ))}
                </select>
            </div>
            {/* Confirmation dialog */}
            {showConfirm && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
                    <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
                        <div className="mb-4 font-semibold">Replace current book content?</div>
                        <div className="mb-4 text-sm text-gray-700">
                            Your current book content will be lost. Are you sure you want to load the sample?
                        </div>
                        <div className="flex justify-end gap-2">
                            <button className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300" onClick={cancelReplace}>
                                Cancel
                            </button>
                            <button
                                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                                onClick={confirmReplace}
                            >
                                Replace
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <BookEditor
                value={book}
                onChange={setBook}
                className={styles.BookEditor}
                isVerbose={false}
                onFileUpload={(file) => {
                    return `[${file.name}]`;
                }}
            />
            <h2 className="text-lg font-semibold mt-6 mb-2">Parsed Book Content</h2>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                <code>{JSON.stringify(bookParsed, null, 4)}</code>
            </pre>
            <h2 className="text-lg font-semibold mt-6 mb-2">Model Requirements</h2>
            <div className="mb-4">
                <button
                    type="button"
                    onClick={handleCreateModelRequirements}
                    disabled={isCreatingModelRequirements}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                    {isCreatingModelRequirements ? 'Creating...' : modelRequirements === null ? 'Create' : 'Update'}
                </button>
                {modelRequirements && (
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm mt-4">
                        <code>{JSON.stringify(modelRequirements, null, 4)}</code>
                    </pre>
                )}
            </div>
            <h2 className="text-lg font-semibold mt-6 mb-2">Commitment Definitions (Manual)</h2>
            <div className="flex gap-4">
                {/* Navigation list */}
                <div className="w-64 shrink-0 border border-gray-200 rounded-lg overflow-hidden bg-white">
                    <ul className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                        {definitions.map((d, i) => (
                            <li key={String(d.type)}>
                                <button
                                    type="button"
                                    onClick={() => setSelectedIndex(i)}
                                    className={[
                                        'w-full text-left px-3 py-2 transition-colors',
                                        i === selectedIndex
                                            ? 'bg-indigo-50 text-indigo-700 font-semibold'
                                            : 'hover:bg-gray-50',
                                    ].join(' ')}
                                >
                                    {String(d.type)}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Details */}
                <div className="flex-1 border border-gray-200 rounded-lg p-4 min-h-[10rem] bg-white">
                    {selected ? (
                        <div>
                            <div className="mb-3">
                                <div className="text-sm uppercase text-gray-500 tracking-wide">Commitment</div>
                                <div className="text-xl font-semibold">{String(selected.type)}</div>
                                {/* Optional documentation text */}
                                {(() => {
                                    const doc = (selected as unknown as { documentation?: unknown })?.documentation;
                                    return typeof doc === 'string' && doc.trim() ? (
                                        <div className="mt-3 p-3 rounded-r-lg">
                                            <div style={{ display: 'none' }}>
                                                <div className="text-xs uppercase text-blue-600 font-semibold tracking-wide mb-1">
                                                    Documentation (raw markdown)
                                                </div>
                                                <pre>{doc}</pre>
                                            </div>
                                            <div>
                                                <div className="text-xs uppercase text-blue-600 font-semibold tracking-wide mb-1">
                                                    Documentation
                                                </div>
                                                <div className="text-sm text-blue-800 prose prose-sm prose-blue max-w-none">
                                                    <ReactMarkdown
                                                        components={{
                                                            h1: ({ children }) => (
                                                                <h1 className="text-2xl font-bold mb-3 text-blue-900">
                                                                    {children}
                                                                </h1>
                                                            ),
                                                            h2: ({ children }) => (
                                                                <h2 className="text-xl font-bold mb-2 text-blue-900">
                                                                    {children}
                                                                </h2>
                                                            ),
                                                            h3: ({ children }) => (
                                                                <h3 className="text-lg font-bold mb-2 text-blue-900">
                                                                    {children}
                                                                </h3>
                                                            ),
                                                            h4: ({ children }) => (
                                                                <h4 className="text-base font-bold mb-1 text-blue-900">
                                                                    {children}
                                                                </h4>
                                                            ),
                                                            h5: ({ children }) => (
                                                                <h5 className="text-sm font-bold mb-1 text-blue-900">
                                                                    {children}
                                                                </h5>
                                                            ),
                                                            h6: ({ children }) => (
                                                                <h6 className="text-xs font-bold mb-1 text-blue-900">
                                                                    {children}
                                                                </h6>
                                                            ),
                                                            p: ({ children }) => (
                                                                <p className="mb-2 last:mb-0">{children}</p>
                                                            ),
                                                            code: ({ children }) => (
                                                                <code className="bg-blue-100 text-blue-900 px-1 py-0.5 rounded text-xs font-mono">
                                                                    {children}
                                                                </code>
                                                            ),
                                                            strong: ({ children }) => (
                                                                <strong className="font-semibold text-blue-900">
                                                                    {children}
                                                                </strong>
                                                            ),
                                                            em: ({ children }) => (
                                                                <em className="italic text-blue-700">{children}</em>
                                                            ),
                                                        }}
                                                    >
                                                        {doc}
                                                    </ReactMarkdown>
                                                </div>{' '}
                                            </div>
                                        </div>
                                    ) : null;
                                })()}
                            </div>

                            {/* Description in Markdown */}
                            <div style={{ display: 'none' }} className="text-gray-800">
                                <ReactMarkdown
                                    components={{
                                        h1: ({ children }) => (
                                            <h1 className="text-2xl font-bold mb-3 text-gray-900">{children}</h1>
                                        ),
                                        h2: ({ children }) => (
                                            <h2 className="text-xl font-bold mb-2 text-gray-900">{children}</h2>
                                        ),
                                        h3: ({ children }) => (
                                            <h3 className="text-lg font-bold mb-2 text-gray-900">{children}</h3>
                                        ),
                                        h4: ({ children }) => (
                                            <h4 className="text-base font-bold mb-1 text-gray-900">{children}</h4>
                                        ),
                                        h5: ({ children }) => (
                                            <h5 className="text-sm font-bold mb-1 text-gray-900">{children}</h5>
                                        ),
                                        h6: ({ children }) => (
                                            <h6 className="text-xs font-bold mb-1 text-gray-900">{children}</h6>
                                        ),
                                    }}
                                >
                                    {typeof selected.description === 'string'
                                        ? selected.description
                                        : String(selected.description ?? '')}
                                </ReactMarkdown>
                            </div>
                        </div>
                    ) : (
                        <div className="text-gray-500">No commitment definitions found.</div>
                    )}
                </div>
            </div>
            <h2 className="text-lg font-semibold mt-6 mb-2">Horizontal Book Editor</h2>``
            <BookEditor
                value={book}
                onChange={setBook}
                className={(styles.BookEditor, styles.BookEditorHorizontal)}
                isVerbose={false}
            />
            <h2 className="text-lg font-semibold mt-6 mb-2">Vertical Book Editor</h2>``
            <BookEditor
                value={book}
                onChange={setBook}
                className={(styles.BookEditor, styles.BookEditorVertical)}
                isVerbose={false}
            />
            <h2 className="text-lg font-semibold mt-6 mb-2">Book Editor with Sharp Corners (isBorderRadiusDisabled)</h2>
            <BookEditor
                value={book}
                onChange={setBook}
                className={styles.BookEditor}
                isVerbose={false}
                isBorderRadiusDisabled={true}
            />
            <h2 className="text-lg font-semibold mt-6 mb-2">Book Editor with Footer (isFooterShown)</h2>
            <BookEditor
                value={book}
                onChange={setBook}
                className={styles.BookEditor}
                isVerbose={false}
                isFooterShown={true}
                onFileUpload={(file) => {
                    return `[${file.name}]`;
                }}
            />
            <h2 className="text-lg font-semibold mt-6 mb-2">Book Editor without Footer (default)</h2>
            <BookEditor
                value={book}
                onChange={setBook}
                className={styles.BookEditor}
                isVerbose={false}
                isFooterShown={false}
                onFileUpload={(file) => {
                    return `[${file.name}]`;
                }}
            />
        </div>
    );
}
