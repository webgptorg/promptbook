'use client';

import { useRef, useState } from 'react';

import { cn } from '../lib/cn';

type DropZoneProps = {
    readonly onFiles: (files: readonly File[]) => void;
    readonly hint?: string;
    readonly disabled?: boolean;
};

export function DropZone({ onFiles, hint, disabled }: DropZoneProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    function emit(fileList: FileList | null) {
        const files = fileList ? Array.from(fileList) : [];
        if (files.length > 0) {
            onFiles(files);
        }
    }

    return (
        <div
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-disabled={disabled}
            onClick={() => !disabled && inputRef.current?.click()}
            onKeyDown={(event) => {
                if (!disabled && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    inputRef.current?.click();
                }
            }}
            onDragEnter={(event) => {
                event.preventDefault();
                if (!disabled) setIsDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                if (!disabled) emit(event.dataTransfer.files);
            }}
            className={cn(
                'group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ob-ring)] focus-visible:ring-offset-2',
                disabled && 'cursor-not-allowed opacity-60',
                !disabled && isDragging
                    ? 'scale-[1.01] border-[color:var(--ob-accent-500)] bg-[color:var(--ob-accent-50)]'
                    : 'cursor-pointer border-zinc-300 bg-zinc-50/60 hover:border-[color:var(--ob-accent-300)] hover:bg-[color:var(--ob-accent-50)]/50',
            )}
        >
            <input
                ref={inputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(event) => {
                    emit(event.target.files);
                    event.target.value = '';
                }}
            />
            <span
                className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-full text-2xl transition-colors',
                    isDragging
                        ? 'bg-[color:var(--ob-accent-100)]'
                        : 'bg-white shadow-[var(--ob-shadow-sm)] group-hover:bg-[color:var(--ob-accent-100)]',
                )}
                aria-hidden
            >
                📂
            </span>
            <p className="mt-3 text-sm text-zinc-700">
                <strong className="font-semibold text-zinc-900">Přetáhněte soubory sem</strong> nebo klikněte pro výběr
            </p>
            {hint && <p className="mt-1 text-xs text-zinc-400">{hint}</p>}
        </div>
    );
}
