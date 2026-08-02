'use client';

import type { string_book } from '../../../../../../../src/book-2.0/agent-source/string_book';
import { BookEditor } from '../../../../../../../src/book-components/BookEditor/BookEditor';
import { BOOK_SECTION_PRESETS } from '../config/bookSections';
import { insertBookContentBeforeLearningMarker } from '../lib/bookSource';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

/**
 * Props for the editable manGo Book editor.
 */
type ManGoBookEditorProps = {
    readonly value: string;
    readonly onChange: (value: string) => void;
    readonly onRegenerate?: () => void;
    readonly isRegenerating?: boolean;
};

/**
 * Renders the editable Book source and the Book-language section presets used by manGo.
 *
 * @param props - Current source and editor actions.
 * @returns Editable Book editor with section controls.
 */
export function ManGoBookEditor({ value, onChange, onRegenerate, isRegenerating = false }: ManGoBookEditorProps) {
    function addSection(section: string): void {
        onChange(insertBookContentBeforeLearningMarker(value, [section]));
    }

    return (
        <div>
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[var(--ob-shadow-md)]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-50/80 px-4 py-2.5">
                    <span className="flex items-center gap-2 text-[13px] text-zinc-600">
                        <span aria-hidden>📖</span>
                        <strong className="font-semibold text-zinc-800">Book</strong>
                        <span className="hidden sm:inline">
                            <Badge tone="accent">Plně editovatelný</Badge>
                        </span>
                    </span>
                    {onRegenerate && (
                        <Button
                            variant="ghost"
                            size="sm"
                            isLoading={isRegenerating}
                            leadingIcon={<span aria-hidden>↻</span>}
                            onClick={onRegenerate}
                            title="Přegenerovat book ze zadání"
                        >
                            <span className="hidden md:inline">Přegenerovat</span>
                        </Button>
                    )}
                </div>

                <BookEditor
                    value={value as string_book}
                    onChange={(nextValue) => onChange(nextValue)}
                    height="28rem"
                    isBorderRadiusDisabled
                    isVerbose={false}
                />
            </div>

            <div className="mt-4">
                <div className="mb-2 text-xs font-semibold text-zinc-500">Přidat sekci do booku:</div>
                <div className="flex flex-wrap gap-2">
                    {BOOK_SECTION_PRESETS.map((preset) => (
                        <button
                            key={preset.key}
                            type="button"
                            onClick={() => addSection(preset.book)}
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
