'use client';

import { useState } from 'react';
import { highlightShellCommand } from './highlightShellCommand';

/**
 * Props of `<TerminalBlock/>`.
 */
type TerminalBlockProps = {
    /**
     * Shell command (or multiple newline-separated commands) shown inside the terminal
     */
    readonly command: string;

    /**
     * Title shown in the terminal window title bar
     */
    readonly title?: string;

    /**
     * Optional additional CSS classes of the outer terminal frame
     */
    readonly className?: string;
};

/**
 * How long the "Copied!" confirmation stays visible, in milliseconds.
 */
const COPY_CONFIRMATION_DURATION_MS = 2000;

/**
 * Renders one copyable, syntax-highlighted shell sample styled as a terminal window.
 *
 * Note: Specified in [`specs/components/terminal-block.md`](../../../specs/components/terminal-block.md)
 */
export function TerminalBlock({ command, title = 'bash', className = '' }: TerminalBlockProps) {
    const [isCopied, setIsCopied] = useState(false);

    async function handleCopy() {
        await navigator.clipboard.writeText(command);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), COPY_CONFIRMATION_DURATION_MS);
    }

    return (
        <div
            className={`rounded-xl border border-gray-700/70 bg-[#0d1117] shadow-2xl shadow-black/40 overflow-hidden ${className}`}
        >
            <div className="flex items-center gap-2 border-b border-gray-800 bg-[#161b22] px-4 py-2.5">
                <span className="h-3 w-3 rounded-full bg-[#ff5f57]" aria-hidden />
                <span className="h-3 w-3 rounded-full bg-[#febc2e]" aria-hidden />
                <span className="h-3 w-3 rounded-full bg-[#28c840]" aria-hidden />
                <span className="ml-2 flex-1 truncate text-xs text-gray-400 font-mono">{title}</span>
                <button
                    type="button"
                    onClick={handleCopy}
                    aria-label="Copy command to clipboard"
                    className="rounded-md border border-gray-700 px-2 py-1 text-xs text-gray-300 hover:border-promptbook-blue hover:text-promptbook-blue"
                >
                    {isCopied ? '✔ Copied!' : 'Copy'}
                </button>
            </div>
            <pre className="overflow-x-auto p-4 text-sm leading-relaxed font-mono">
                <code>
                    {command.split('\n').map((commandLine, lineIndex) => (
                        <div key={lineIndex} className="whitespace-pre-wrap break-words">
                            <span className="select-none text-gray-500">$ </span>
                            {highlightShellCommand(commandLine)}
                        </div>
                    ))}
                </code>
            </pre>
        </div>
    );
}
