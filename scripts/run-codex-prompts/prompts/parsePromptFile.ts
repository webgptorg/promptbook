import { basename } from 'path';
import { extractPromptRunnerTokens } from './isPromptCompatibleWithRunner';
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
        const line = lines[i];
        const isSeparator = i < lines.length && line !== undefined && line.trim() === '---';
        const isEnd = i === lines.length;
        if (!isSeparator && !isEnd) {
            continue;
        }

        const endLine = i - 1;
        const firstNonEmptyLine = findFirstNonEmptyLine(lines, startLine, endLine);
        if (firstNonEmptyLine !== undefined) {
            const statusLine = (lines[firstNonEmptyLine] || '').trim();
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
 * Parses a status line like "[ ] !!", "[ ] use `gpt` !!!!!" or "[-]" into status and priority.
 * For [x] done and [!] failed prompts, allow metadata after the status marker.
 */
function parseStatusLine(line: string): { status: PromptStatus; priority: number } | undefined {
    // For done prompts [x], allow any content after (for cost/time metadata)
    const doneMatch = line.match(/^\[(?<status>[xX])\]/);
    if (doneMatch) {
        return { status: 'done', priority: 0 };
    }

    // For failed prompts [!], allow any content after (for failure metadata)
    const failedMatch = line.match(/^\[(?<status>!)\]/);
    if (failedMatch) {
        return { status: 'failed', priority: 0 };
    }

    // For not-ready [-], keep the historical clean-line syntax.
    if (/^\[-\]\s*!*\s*$/u.test(line)) {
        return { status: 'not-ready', priority: 0 };
    }

    // Todo [ ] may contain backtick-delimited model/harness tokens and priority markers
    // before or after those tokens. Other trailing text remains an invalid status line.
    const todoMatch = line.match(/^\[ \](?<details>.*)$/u);
    if (!todoMatch) {
        return undefined;
    }

    const details = todoMatch.groups?.details ?? '';
    const isPriorityOnly = /^[!\s]*$/u.test(details);
    const hasPromptRunnerTokens = extractPromptRunnerTokens(line).length > 0;

    if (details.trim() !== '' && !isPriorityOnly && !hasPromptRunnerTokens) {
        return undefined;
    }

    return { status: 'todo', priority: details.match(/!/gu)?.length ?? 0 };
}

/**
 * Finds the first non-empty line index between two bounds.
 */
function findFirstNonEmptyLine(lines: string[], startLine: number, endLine: number): number | undefined {
    for (let i = startLine; i <= endLine; i++) {
        const line = lines[i];
        if (line !== undefined && line.trim() !== '') {
            return i;
        }
    }
    return undefined;
}
