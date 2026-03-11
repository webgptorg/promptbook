import { padBook } from '../../../../../src/book-2.0/agent-source/padBook';
import { validateBook } from '../../../../../src/book-2.0/agent-source/string_book';
import type { string_book } from '../../../../../src/book-2.0/agent-source/string_book';

/**
 * Matches top-level `META IMAGE` / `IMAGE` lines.
 */
const META_IMAGE_LINE_PATTERN = /^\s*(META\s+IMAGE|IMAGE)\b/i;

/**
 * Matches top-level `META COLOR` / `COLOR` lines.
 */
const META_COLOR_LINE_PATTERN = /^\s*(META\s+COLOR|COLOR)\b/i;

/**
 * Upserts materialized avatar metadata into agent source while removing older image/color declarations.
 */
export function upsertSelfLearningMetaImageAndColor(
    agentSource: string_book,
    options: {
        readonly imageUrl?: string | null;
        readonly colors?: ReadonlyArray<string> | null;
    },
): string_book {
    const filteredLines = agentSource
        .split(/\r?\n/)
        .filter((line: string) => !META_IMAGE_LINE_PATTERN.test(line) && !META_COLOR_LINE_PATTERN.test(line));

    const nextMetaLines: Array<string> = [];
    if (options.imageUrl) {
        nextMetaLines.push(`META IMAGE ${options.imageUrl}`);
    }
    if (options.colors && options.colors.length > 0) {
        nextMetaLines.push(`META COLOR ${options.colors.join(', ')}`);
    }

    const baseSource = filteredLines.join('\n').trimEnd();
    const nextSource =
        nextMetaLines.length === 0 ? baseSource : `${baseSource}\n\n${nextMetaLines.join('\n')}`;

    return padBook(validateBook(nextSource.trim())) as string_book;
}
