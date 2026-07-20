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
            const requiredModelOrHarnessTokens = parsedStatus?.requiredModelOrHarnessTokens ?? [];

            sections.push({
                index,
                startLine,
                endLine,
                status,
                priority,
                requiredModelOrHarnessTokens,
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
 * Parses a status line into status, priority and any required model or harness tokens.
 *
 * Examples: "[ ] !!", "[-]", "[ ] use `gpt-5.5`", "[ ] !!!! `gpt`", "[x] ~$0.65 21 minutes...".
 * For [x] done and [!] failed prompts, any content after the status marker is allowed and ignored.
 */
function parseStatusLine(
    line: string,
): { status: PromptStatus; priority: number; requiredModelOrHarnessTokens: string[] } | undefined {
    // For done prompts [x], allow any content after (for cost/time metadata)
    const doneMatch = line.match(/^\[(?<status>[xX])\]/);
    if (doneMatch) {
        return { status: 'done', priority: 0, requiredModelOrHarnessTokens: [] };
    }

    // For failed prompts [!], allow any content after (for failure metadata)
    const failedMatch = line.match(/^\[(?<status>!)\]/);
    if (failedMatch) {
        return { status: 'failed', priority: 0, requiredModelOrHarnessTokens: [] };
    }

    // For todo [ ] and not-ready [-], the marker may be followed by priority markers (`!`) and/or
    // required model or harness tokens written in backticks (for example `gpt-5.5` or `github-copilot`).
    const match = line.match(/^\[(?<status>[ -])\](?<annotations>.*)$/);
    if (!match) {
        return undefined;
    }

    const parsedAnnotations = parseStatusLineAnnotations(match.groups?.annotations ?? '');
    if (parsedAnnotations === undefined) {
        return undefined;
    }

    const status: PromptStatus = match.groups?.status?.toLowerCase() === '-' ? 'not-ready' : 'todo';

    // Note: Only actionable todo prompts carry a priority and a runner requirement
    return {
        status,
        priority: status === 'todo' ? parsedAnnotations.priority : 0,
        requiredModelOrHarnessTokens: status === 'todo' ? parsedAnnotations.requiredModelOrHarnessTokens : [],
    };
}

/**
 * Parses the annotations that may follow a todo `[ ]` or not-ready `[-]` status marker.
 *
 * Recognizes priority markers (`!`) and required model or harness tokens written in backticks, so
 * that a line such as "[ ] use `github-copilot` !!!!!" yields priority `5` and token `github-copilot`.
 * When at least one backtick token is present the surrounding free-text filler (for example `use`
 * or `model`) is ignored. When no token is present the annotations must contain only priority
 * markers, matching the historical strict parsing so that unrelated lines are not read as statuses.
 *
 * Returns `undefined` when the annotations cannot be interpreted as a status line.
 */
function parseStatusLineAnnotations(
    annotations: string,
): { priority: number; requiredModelOrHarnessTokens: string[] } | undefined {
    const requiredModelOrHarnessTokens: string[] = [];
    const annotationsWithoutTokens = annotations.replace(/`(?<token>[^`]+)`/g, (_wholeMatch, token: string) => {
        const trimmedToken = token.trim();
        if (trimmedToken !== '') {
            requiredModelOrHarnessTokens.push(trimmedToken);
        }
        return ' ';
    });

    if (requiredModelOrHarnessTokens.length === 0 && !/^[\s!]*$/.test(annotationsWithoutTokens)) {
        return undefined;
    }

    const priority = (annotationsWithoutTokens.match(/!/g) ?? []).length;
    return { priority, requiredModelOrHarnessTokens };
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
