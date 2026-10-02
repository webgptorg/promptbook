import { basename } from 'path';
import { findFirstNonEmptyLineIndex } from './findFirstNonEmptyLineIndex';
import { extractPromptRunnerTokens } from './isPromptCompatibleWithRunner';
import type { PromptFile } from './types/PromptFile';
import type { PromptSection } from './types/PromptSection';
import type { PromptStatus } from './types/PromptStatus';

/**
 * Matches the supported prompt status markers at the start of a line.
 *
 * A different bracketed prefix can be ordinary prompt content, for example an emoji tag.
 *
 * @private internal constant of `parsePromptFile`
 */
const PROMPT_STATUS_LINE_PATTERN = /^\[(?<marker> |-|\.|[xX]|\^|!)\](?<details>.*)$/u;

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
        const firstNonEmptyLine = findFirstNonEmptyLineIndex(lines, startLine, endLine);
        if (firstNonEmptyLine !== undefined) {
            const statusLine = (lines[firstNonEmptyLine] || '').trim();
            const parsedStatus = parseStatusLine(statusLine);
            const status = parsedStatus?.status ?? (PROMPT_STATUS_LINE_PATTERN.test(statusLine) ? 'not-ready' : 'todo');
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
 * For [x] done, [!] failed and [^] in-progress prompts, allow metadata after the status marker.
 */
function parseStatusLine(line: string): { status: PromptStatus; priority: number } | undefined {
    const statusLineMatch = line.match(PROMPT_STATUS_LINE_PATTERN);
    const marker = statusLineMatch?.groups?.marker;
    const details = statusLineMatch?.groups?.details ?? '';

    if (marker === 'x' || marker === 'X') {
        // For done prompts [x], allow any content after (for cost/time metadata).
        return { status: 'done', priority: 0 };
    }

    if (marker === '!') {
        // For failed prompts [!], allow any content after (for failure metadata).
        return { status: 'failed', priority: 0 };
    }

    if (marker === '^') {
        // For in-progress prompts [^], allow any content after (for the steps recorded so far).
        return { status: 'in-progress', priority: 0 };
    }

    // Treat [.] as the alternative spelling of not-ready [-], preserving the historical clean-line syntax.
    if ((marker === '-' || marker === '.') && /^[!\s]*$/u.test(details)) {
        return { status: 'not-ready', priority: 0 };
    }

    if (marker !== ' ') {
        return undefined;
    }

    // Todo [ ] may contain backtick-delimited model/harness tokens and priority markers
    // before or after those tokens. Other trailing text remains an invalid status line.
    const isPriorityOnly = /^[!\s]*$/u.test(details);
    const hasPromptRunnerTokens = extractPromptRunnerTokens(line).length > 0;

    if (details.trim() !== '' && !isPriorityOnly && !hasPromptRunnerTokens) {
        return undefined;
    }

    return { status: 'todo', priority: details.match(/!/gu)?.length ?? 0 };
}
