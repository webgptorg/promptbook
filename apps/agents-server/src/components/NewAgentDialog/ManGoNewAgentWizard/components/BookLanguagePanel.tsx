'use client';

import { useState } from 'react';

import type { string_book } from '../../../../../../../src/book-2.0/agent-source/string_book';
import { BookEditor } from '../../../../../../../src/book-components/BookEditor/BookEditor';
import { convertToBook } from '../services/bookService';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Spinner } from './ui/Spinner';

type Phase = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Converts the editor's markdown draft into canonical Book language via the `generateBook`
 * endpoint and shows the validated result. Optional, on-demand — keeps the free-markdown
 * editing flow intact while exposing the "real" Book artifact.
 */
export function BookLanguagePanel({ source }: { readonly source: string }) {
    const [phase, setPhase] = useState<Phase>('idle');
    const [book, setBook] = useState('');
    const [isValid, setIsValid] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [generatedFrom, setGeneratedFrom] = useState('');
    const [copied, setCopied] = useState(false);

    async function generate() {
        setPhase('loading');
        setError(null);
        try {
            const result = await convertToBook(source);
            setBook(result.book);
            setIsValid(result.isValid);
            setGeneratedFrom(source);
            setPhase('ready');
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'Převod na Book selhal.');
            setPhase('error');
        }
    }

    function copy() {
        void navigator.clipboard?.writeText(book).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    }

    const isStale = phase === 'ready' && source !== generatedFrom;

    return (
        <div className="mt-5 rounded-2xl border border-zinc-200/60 bg-white p-5 shadow-[var(--ob-shadow-sm)]">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-sm font-semibold text-zinc-800">Book language</div>
                    <div className="mt-0.5 text-xs text-zinc-400">
                        Kanonická, validovaná podoba agenta vygenerovaná z vašeho draftu.
                    </div>
                </div>
                {phase === 'ready' && (
                    <Badge tone={isValid ? 'success' : 'warning'} dot>
                        {isValid ? 'Validní book' : 'Nevalidní'}
                    </Badge>
                )}
            </div>

            {phase === 'idle' && (
                <div className="mt-4">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={!source.trim()}
                        leadingIcon={<span aria-hidden>✨</span>}
                        onClick={() => void generate()}
                    >
                        Převést na Book language
                    </Button>
                </div>
            )}

            {phase === 'loading' && (
                <div className="mt-4 flex items-center gap-2 text-sm text-zinc-500">
                    <Spinner className="h-4 w-4" /> Generuji Book…
                </div>
            )}

            {phase === 'error' && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
                    <p>{error}</p>
                    <button
                        type="button"
                        onClick={() => void generate()}
                        className="mt-1 font-medium underline underline-offset-2"
                    >
                        Zkusit znovu
                    </button>
                </div>
            )}

            {phase === 'ready' && (
                <div className="mt-4">
                    <BookEditor value={book as string_book} isReadonly />
                    {isStale && (
                        <p className="mt-2 text-xs text-amber-600">
                            Draft se od převodu změnil — přegenerujte pro aktuální book.
                        </p>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            leadingIcon={<span aria-hidden>↻</span>}
                            onClick={() => void generate()}
                        >
                            Přegenerovat
                        </Button>
                        <Button variant="ghost" size="sm" onClick={copy}>
                            {copied ? '✓ Zkopírováno' : 'Kopírovat'}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
