'use client';

import { useRef, useState } from 'react';

import { BOOK_SECTION_PRESETS } from '../config/bookSections';
import { cn } from '../lib/cn';
import { MarkdownPreview } from './MarkdownPreview';
import { Badge } from './ui/Badge';
import { Spinner } from './ui/Spinner';

type MarkdownBookEditorProps = {
    readonly value: string;
    readonly onChange: (value: string) => void;
    readonly onRegenerate?: () => void;
    readonly isRegenerating?: boolean;
};

type ViewMode = 'edit' | 'split' | 'preview';

const VIEW_MODES: ReadonlyArray<{ id: ViewMode; label: string; icon: string }> = [
    { id: 'edit', label: 'Editor', icon: '✎' },
    { id: 'split', label: 'Obojí', icon: '⊟' },
    { id: 'preview', label: 'Náhled', icon: '◳' },
];

const PANE_HEIGHT = 'h-[28rem]';

export function MarkdownBookEditor({ value, onChange, onRegenerate, isRegenerating }: MarkdownBookEditorProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [mode, setMode] = useState<ViewMode>('edit');

    function appendSection(markdown: string) {
        const trimmed = value.replace(/\s+$/, '');
        const next = trimmed ? `${trimmed}\n\n${markdown}\n` : `${markdown}\n`;
        onChange(next);

        // Make sure the new section is visible to edit.
        if (mode === 'preview') {
            setMode('split');
        }

        const textarea = textareaRef.current;
        if (textarea) {
            textarea.focus();
            requestAnimationFrame(() => {
                textarea.scrollTop = textarea.scrollHeight;
                textarea.setSelectionRange(next.length, next.length);
            });
        }
    }

    const isEditorShown = mode !== 'preview';
    const isPreviewShown = mode !== 'edit';

    return (
        <div>
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[var(--ob-shadow-md)] transition-shadow focus-within:shadow-[var(--ob-shadow-lg)] focus-within:ring-1 focus-within:ring-[color:var(--ob-accent-200)]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-50/80 px-4 py-2.5">
                    <span className="flex items-center gap-2 text-[13px] text-zinc-600">
                        <span aria-hidden>📄</span>
                        <strong className="font-semibold text-zinc-800">book.md</strong>
                        <span className="hidden sm:inline">
                            <Badge tone="accent">Plně editovatelný</Badge>
                        </span>
                    </span>
                    <span className="flex items-center gap-2">
                        <ViewToggle mode={mode} onChange={setMode} />
                        {onRegenerate && (
                            <button
                                type="button"
                                onClick={onRegenerate}
                                disabled={isRegenerating}
                                title="Přegenerovat ze zadání"
                                className="inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-[color:var(--ob-accent-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ob-ring)] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isRegenerating ? <Spinner className="h-3.5 w-3.5" /> : <span aria-hidden>↻</span>}
                                <span className="hidden md:inline">Přegenerovat</span>
                            </button>
                        )}
                    </span>
                </div>

                <div className={cn('grid', mode === 'split' && 'md:grid-cols-2 md:divide-x md:divide-zinc-200')}>
                    {isEditorShown && (
                        <textarea
                            ref={textareaRef}
                            value={value}
                            spellCheck={false}
                            onChange={(event) => onChange(event.target.value)}
                            aria-label="Obsah booku v markdownu"
                            className={cn(
                                'block w-full resize-none border-0 bg-white p-4 font-mono text-[13px] leading-relaxed text-zinc-800 focus:outline-none focus:ring-0',
                                mode === 'edit' ? 'min-h-[28rem] resize-y' : PANE_HEIGHT,
                            )}
                        />
                    )}
                    {isPreviewShown && (
                        <div className={cn('overflow-y-auto bg-white p-4', mode === 'preview' ? 'min-h-[28rem]' : PANE_HEIGHT)}>
                            {value.trim() ? (
                                <MarkdownPreview source={value} />
                            ) : (
                                <p className="text-sm text-zinc-400">Náhled se zobrazí, jakmile book nebude prázdný.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-4">
                <div className="mb-2 text-xs font-semibold text-zinc-500">Přidat předepsanou sekci:</div>
                <div className="flex flex-wrap gap-2">
                    {BOOK_SECTION_PRESETS.map((preset) => (
                        <button
                            key={preset.key}
                            type="button"
                            onClick={() => appendSection(preset.markdown)}
                            className="inline-flex items-center gap-1 rounded-full border border-dashed border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:border-[color:var(--ob-accent-400)] hover:bg-[color:var(--ob-accent-50)] hover:text-[color:var(--ob-accent-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ob-ring)]"
                        >
                            + {preset.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

function ViewToggle({ mode, onChange }: { readonly mode: ViewMode; readonly onChange: (mode: ViewMode) => void }) {
    return (
        <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-0.5" role="tablist" aria-label="Zobrazení editoru">
            {VIEW_MODES.map((view) => {
                const isActive = view.id === mode;
                return (
                    <button
                        key={view.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => onChange(view.id)}
                        className={cn(
                            'inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ob-ring)]',
                            isActive
                                ? 'bg-[color:var(--ob-accent-600)] text-white'
                                : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800',
                        )}
                    >
                        <span aria-hidden>{view.icon}</span>
                        <span className="hidden sm:inline">{view.label}</span>
                    </button>
                );
            })}
        </div>
    );
}
