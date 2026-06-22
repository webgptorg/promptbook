import type { ReactNode } from 'react';

import { cn } from '../lib/cn';

/**
 * Tiny, dependency-free Markdown renderer for the book preview. Renders to React nodes
 * (no `dangerouslySetInnerHTML`), covering the subset used in agent books: headings,
 * bold/italic/inline-code/links, unordered & ordered lists, blockquotes, horizontal rules
 * and paragraphs. Anything it doesn't recognize falls through as plain paragraph text.
 */
export function MarkdownPreview({ source, className }: { readonly source: string; readonly className?: string }) {
    return <div className={cn('text-sm leading-relaxed text-zinc-700', className)}>{renderBlocks(source)}</div>;
}

function renderBlocks(source: string): ReactNode[] {
    const lines = source.replace(/\r\n/g, '\n').split('\n');
    const blocks: ReactNode[] = [];
    let index = 0;
    let key = 0;

    while (index < lines.length) {
        const line = lines[index];

        if (line.trim() === '') {
            index += 1;
            continue;
        }

        const heading = /^(#{1,4})\s+(.*)$/.exec(line);
        if (heading) {
            blocks.push(renderHeading(heading[1].length, heading[2], key++));
            index += 1;
            continue;
        }

        if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
            blocks.push(<hr key={key++} className="my-4 border-zinc-200" />);
            index += 1;
            continue;
        }

        if (line.startsWith('>')) {
            const quote: string[] = [];
            while (index < lines.length && lines[index].startsWith('>')) {
                quote.push(lines[index].replace(/^>\s?/, ''));
                index += 1;
            }
            blocks.push(
                <blockquote key={key++} className="my-3 border-l-2 border-[color:var(--ob-accent-300)] pl-3 italic text-zinc-500">
                    {renderInline(quote.join(' '))}
                </blockquote>,
            );
            continue;
        }

        if (/^[-*+]\s+/.test(line)) {
            const items: string[] = [];
            while (index < lines.length && /^[-*+]\s+/.test(lines[index])) {
                items.push(lines[index].replace(/^[-*+]\s+/, ''));
                index += 1;
            }
            blocks.push(
                <ul key={key++} className="my-2 list-disc space-y-1 pl-5">
                    {items.map((item, itemIndex) => (
                        <li key={itemIndex}>{renderInline(item)}</li>
                    ))}
                </ul>,
            );
            continue;
        }

        if (/^\d+\.\s+/.test(line)) {
            const items: string[] = [];
            while (index < lines.length && /^\d+\.\s+/.test(lines[index])) {
                items.push(lines[index].replace(/^\d+\.\s+/, ''));
                index += 1;
            }
            blocks.push(
                <ol key={key++} className="my-2 list-decimal space-y-1 pl-5">
                    {items.map((item, itemIndex) => (
                        <li key={itemIndex}>{renderInline(item)}</li>
                    ))}
                </ol>,
            );
            continue;
        }

        // Paragraph: gather consecutive plain lines.
        const paragraph: string[] = [];
        while (index < lines.length && lines[index].trim() !== '' && !isBlockStart(lines[index])) {
            paragraph.push(lines[index]);
            index += 1;
        }
        blocks.push(
            <p key={key++} className="my-2">
                {paragraph.map((text, lineIndex) => (
                    <span key={lineIndex}>
                        {lineIndex > 0 && <br />}
                        {renderInline(text)}
                    </span>
                ))}
            </p>,
        );
    }

    return blocks;
}

function isBlockStart(line: string): boolean {
    return (
        /^(#{1,4})\s+/.test(line) ||
        /^(-{3,}|\*{3,}|_{3,})\s*$/.test(line) ||
        line.startsWith('>') ||
        /^[-*+]\s+/.test(line) ||
        /^\d+\.\s+/.test(line)
    );
}

function renderHeading(level: number, text: string, key: number): ReactNode {
    const content = renderInline(text);
    const className = {
        1: 'mt-5 mb-2 text-xl font-bold text-zinc-900 first:mt-0',
        2: 'mt-5 mb-1.5 text-base font-bold text-zinc-900 first:mt-0',
        3: 'mt-4 mb-1 text-sm font-semibold text-zinc-900 first:mt-0',
        4: 'mt-3 mb-1 text-[13px] font-semibold tracking-wide text-zinc-500 first:mt-0',
    }[level as 1 | 2 | 3 | 4];

    if (level === 1) return <h1 key={key} className={className}>{content}</h1>;
    if (level === 2) return <h2 key={key} className={className}>{content}</h2>;
    if (level === 3) return <h3 key={key} className={className}>{content}</h3>;
    return <h4 key={key} className={className}>{content}</h4>;
}

const INLINE_PATTERN = /(`[^`]+`)|(\*\*[^*]+?\*\*)|(\*[^*]+?\*)|(_[^_]+?_)|(\[[^\]]+?\]\([^)]+?\))/g;

function renderInline(text: string): ReactNode[] {
    const nodes: ReactNode[] = [];
    const pattern = new RegExp(INLINE_PATTERN.source, 'g');
    let lastIndex = 0;
    let key = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
        if (match.index > lastIndex) {
            nodes.push(text.slice(lastIndex, match.index));
        }

        const token = match[0];
        if (token.startsWith('`')) {
            nodes.push(
                <code key={key++} className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[12px] text-zinc-700">
                    {token.slice(1, -1)}
                </code>,
            );
        } else if (token.startsWith('**')) {
            nodes.push(<strong key={key++} className="font-semibold text-zinc-900">{token.slice(2, -2)}</strong>);
        } else if (token.startsWith('*')) {
            nodes.push(<em key={key++}>{token.slice(1, -1)}</em>);
        } else if (token.startsWith('_')) {
            nodes.push(<em key={key++}>{token.slice(1, -1)}</em>);
        } else {
            const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
            if (link) {
                nodes.push(
                    <a
                        key={key++}
                        href={link[2]}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[color:var(--ob-accent-700)] underline underline-offset-2"
                    >
                        {link[1]}
                    </a>,
                );
            } else {
                nodes.push(token);
            }
        }

        lastIndex = match.index + token.length;
    }

    if (lastIndex < text.length) {
        nodes.push(text.slice(lastIndex));
    }

    return nodes;
}
