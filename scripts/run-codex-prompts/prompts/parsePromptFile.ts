import { basename } from 'path';
import type { PromptFile } from './types/PromptFile';
import type { PromptSection } from './types/PromptSection';
import type { PromptStatus } from './types/PromptStatus';

/**
 * Parses a prompt markdown file into sections and metadata.
 */
export function parsePromptFile(filePath: string, content: string): PromptFile {
    const eol = content.includes('\r\n') ? '\r\n' : '\n';
    const hasFinalEol = content.endsWith('\n');
    const lines = content.split(/\r?\n/);
    const sections: PromptSection[] = [];

    let startLine = 0;
    let index = 0;

    for (let i = 0; i <= lines.length; i++) {
        const isSeparator = i < lines.length && lines[i].trim() === '---';
        const isEnd = i === lines.length;
        if (!isSeparator && !isEnd) {
            continue;
        }

        const endLine = i - 1;
        const firstNonEmptyLine = findFirstNonEmptyLine(lines, startLine, endLine);
        if (firstNonEmptyLine !== undefined) {
            const statusLine = lines[firstNonEmptyLine].trim();
            const parsedStatus = parseStatusLine(statusLine);
            const status = parsedStatus?.status ?? 'not-ready';
            const priority = parsedStatus?.priority ?? 0;

            sections.push({
                index,
                startLine,
                endLine,
                status,
                priority,
                statusLineIndex: parsedStatus ? firstNonEmptyLine : undefined,
            });
            index += 1;
        }

        startLine = i + 1;
    }

    return {
        path: filePath,
        name: basename(filePath),
        lines,
        eol,
        hasFinalEol,
        sections,
    };
}

/**
 * Parses a status line like "[ ] !!" into status and priority.
 */
function parseStatusLine(line: string): { status: PromptStatus; priority: number } | undefined {
    const match = line.match(/^\[(?<status>[ xX])\]\s*(?<priority>!*)\s*$/);
    if (!match) {
        return undefined;
    }
    const status = match.groups?.status?.toLowerCase() === 'x' ? 'done' : 'todo';
    const priority = status === 'todo' ? match.groups?.priority?.length ?? 0 : 0;
    return { status, priority };
}

/**
 * Finds the first non-empty line index between two bounds.
 */
function findFirstNonEmptyLine(lines: string[], startLine: number, endLine: number): number | undefined {
    for (let i = startLine; i <= endLine; i++) {
        if (lines[i] !== undefined && lines[i].trim() !== '') {
            return i;
        }
    }
    return undefined;
}
