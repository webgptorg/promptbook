import colors from 'colors';
import { fitPlainText, wrapTerminalText } from '../coderRunUiText';
import type { CoderOutputEvent, CoderOutputKind, CoderOutputMode } from './CoderOutputEvent';
import type { CoderRawOutputChunk } from './CoderRunOutput';

/** Category colors supplement explicit text labels, including terminals without color support. */
const OUTPUT_COLORS: Record<CoderOutputKind, (text: string) => string> = {
    agent: colors.cyan,
    reasoning: colors.gray,
    tool: colors.blue,
    files: colors.magenta,
    check: colors.blue,
    result: colors.green,
    warning: colors.yellow,
    error: colors.red,
    status: colors.gray,
    unknown: colors.yellow,
};

/** Wrapped rows retain their attribution when the beginning of a long message scrolls off screen. */
type OutputRow = { readonly line: string; readonly label?: string; readonly isHeading?: boolean };

/** Completed messages do not need rewrapping when another stream emits a delta. */
const EVENT_ROW_CACHE = new WeakMap<CoderOutputEvent, { width: number; rows: OutputRow[] }>();

/** At most one width/revision per view is retained for each invocation; dead invocations are collectible. */
const WRAPPED_OUTPUT_CACHE = new WeakMap<
    readonly CoderRawOutputChunk[],
    Partial<
        Record<
            CoderOutputMode,
            {
                revision: number;
                width: number;
                rows: OutputRow[];
            }
        >
    >
>();

/** Reads the last rendered scroll extent without doing presentation work on the input-control path. */
export function getCoderOutputScrollMaximum(
    chunks: readonly CoderRawOutputChunk[],
    mode: CoderOutputMode,
    height: number,
): number {
    return Math.max(0, (WRAPPED_OUTPUT_CACHE.get(chunks)?.[mode]?.rows.length ?? height) - height);
}

/** Builds a fixed-height, wrapped viewport from the selected projection of the same stream. */
export function buildCoderOutputLines(options: {
    readonly mode: CoderOutputMode;
    readonly events: readonly CoderOutputEvent[];
    readonly rawChunks: readonly CoderRawOutputChunk[];
    readonly width: number;
    readonly height: number;
    readonly scrollOffset: number;
    readonly isHistoryTruncated: boolean;
    readonly revision?: number;
}): { lines: string[]; maxScrollOffset: number } {
    const { mode, width, height } = options;
    const cache = WRAPPED_OUTPUT_CACHE.get(options.rawChunks) || {};
    const cachedView = cache[mode];
    let rows =
        options.revision !== undefined && cachedView?.revision === options.revision && cachedView.width === width
            ? cachedView.rows
            : undefined;
    if (!rows) {
        rows =
            mode === 'raw'
                ? buildRawLines(options.rawChunks, width)
                : options.events.flatMap((event) => buildEventRows(event, width));
        if (options.isHistoryTruncated)
            rows.unshift({ line: fitPlainText('Earlier output remains in the run trace.', width) });
        if (!rows.length) rows.push({ line: fitPlainText('Waiting for output from this task.', width) });
        if (options.revision !== undefined) {
            cache[mode] = { revision: options.revision, width, rows };
            WRAPPED_OUTPUT_CACHE.set(options.rawChunks, cache);
        }
    }
    const maxScrollOffset = Math.max(0, rows.length - height);
    const end = rows.length - Math.min(options.scrollOffset, maxScrollOffset);
    const start = Math.max(0, end - height);
    const visible = rows.slice(start, end).map((row) => row.line);
    const first = rows[start];
    if (start > 0 && first?.label && !first.isHeading)
        visible[0] = colors.gray(fitPlainText(`[${first.label} · continued]`, width));
    while (visible.length < height) visible.push('');
    return { lines: visible, maxScrollOffset };
}

/** Wraps an immutable event once at the current width, retaining labels during scrolling. */
function buildEventRows(event: CoderOutputEvent, width: number): OutputRow[] {
    const cached = EVENT_ROW_CACHE.get(event);
    if (cached?.width === width) return cached.rows;
    const indentation = ' '.repeat(Math.min(2, Math.max(0, width - 1)));
    const rows = [
        ...wrapTerminalText(`[${event.title}]`, width).map((line) => ({
            line: OUTPUT_COLORS[event.kind](line),
            label: event.title,
            isHeading: true,
        })),
        ...wrapTerminalText(event.text, width - indentation.length).map((line) => ({
            line: indentation + line,
            label: event.title,
        })),
        { line: '' },
    ];
    EVENT_ROW_CACHE.set(event, { width, rows });
    return rows;
}

/** Joins adjacent chunks only from the same stream, preserving original text and stream transitions. */
function buildRawLines(chunks: readonly CoderRawOutputChunk[], width: number): OutputRow[] {
    const groups: Array<{ text: string; source: string }> = [];
    for (const chunk of chunks) {
        const previous = groups[groups.length - 1];
        if (previous?.source === chunk.source) previous.text += chunk.text;
        else groups.push({ ...chunk });
    }
    return groups.flatMap((group) => [
        ...wrapTerminalText(`[${group.source}]`, width).map((line) => ({
            line: colors.gray(line),
            label: group.source,
            isHeading: true,
        })),
        ...wrapTerminalText(group.text, width).map((line) => ({ line, label: group.source })),
    ]);
}
