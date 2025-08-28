'use client';

import { BookEditor } from '@promptbook-local/components';
import { DEFAULT_BOOK, getAllCommitmentDefinitions, parseAgentSource } from '@promptbook-local/core';
import type { string_book } from '@promptbook-local/types';
import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import styles from './BookEditorPreview.module.css';

/**
 * Renders a preview of `<BookEditor />` component.
 */
export default function BookEditorPreview() {
    const [book, setBook] = useState<string_book>(DEFAULT_BOOK);

    const bookParsed = useMemo(() => {
        return parseAgentSource(book);
    }, [book]);

    // Commitment definitions manual (navigable)
    const definitions = useMemo(() => getAllCommitmentDefinitions(), []);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const selected = definitions[selectedIndex];

    return (
        <div className={`w-full`}>
            <BookEditor value={book} onChange={setBook} className={styles.BookEditor} />

            <h2 className="text-lg font-semibold mt-6 mb-2">Parsed Book Content</h2>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                <code>{JSON.stringify(bookParsed, null, 4)}</code>
            </pre>

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
        </div>
    );
}
