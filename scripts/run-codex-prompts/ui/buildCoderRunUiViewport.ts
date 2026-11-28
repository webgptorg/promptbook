import { fitPlainText, stripAnsi } from './coderRunUiText';

/** Keeps controls reachable in short terminals and makes the entire existing dashboard scrollable. */
export function buildCoderRunUiViewport(
    lines: string[],
    columns: number,
    rows: number,
    scrollOffset: number,
): { lines: string[]; maxScrollOffset: number } {
    if (lines.length <= rows) return { lines, maxScrollOffset: 0 };
    const controlsIndex = lines.findIndex((line) => stripAnsi(line).startsWith('┌ Controls'));
    const footer = controlsIndex < 0 ? [] : lines.slice(controlsIndex);
    const body = controlsIndex < 0 ? lines : lines.slice(0, controlsIndex);
    const bodyHeight = Math.max(1, rows - footer.length - 1);
    const maxScrollOffset = Math.max(0, body.length - bodyHeight);
    const end = body.length - Math.min(scrollOffset, maxScrollOffset);
    const start = Math.max(0, end - bodyHeight);
    const viewport = [
        fitPlainText(`[pgup/pgdn] Dashboard · rows ${start + 1}-${end}/${body.length}`, Math.max(0, columns - 1)),
        ...body.slice(start, end),
        ...footer,
    ];
    return { lines: viewport.slice(-Math.max(1, rows)), maxScrollOffset };
}
