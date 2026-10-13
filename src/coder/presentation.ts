import type { Writable } from 'node:stream';

/** Terminal layout and color are independent of command lifetime and input policy. @private */
export interface TerminalPresentation { pretty: boolean; color: boolean; width: number; }
/** Semantic emphasis always retains its meaning when color is suppressed. @private */
export type PresentationTone = 'title' | 'muted' | 'success' | 'warning' | 'error' | 'accent';
/** One readable section in a finite document, including scoped help. @private */
export interface DocumentSection { title: string; lines: readonly string[]; }
/** Optional explanatory text and next actions in a one-shot result. @private */
export interface PanelOptions { details?: readonly string[]; next?: readonly string[]; tone?: PresentationTone; }

/** Color suppression keeps the rich layout; redirected/dumb surfaces use conventional plain text. @private */
export function presentationFor(output: Writable = process.stdout, raw = false): TerminalPresentation {
    const terminal = output as NodeJS.WriteStream;
    const pretty = !raw && Boolean(terminal.isTTY) && process.env.TERM !== 'dumb';
    return { pretty, color: pretty && process.env.NO_COLOR === undefined && process.env.FORCE_COLOR !== '0', width: Math.max(12, terminal.columns || 80) };
}

/** Remove terminal instructions while retaining literal multiline content. @private */
export function plainTerminal(text: string): string {
    return text.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '').replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g, '').replace(/\r\n?/g, '\n');
}

/** Unicode graphemes retain accents and joined emoji during wrapping. */
const segments = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
/** Count standard terminal cells conservatively for wide scripts and emoji clusters. */
function cells(glyph: string): number {
    if (/^[\p{Mark}\u200d\ufe0e\ufe0f]+$/u.test(glyph)) return 0;
    if (/[\p{Emoji_Presentation}\ufe0f\u20e3]/u.test(glyph)) return 2;
    const point = glyph.codePointAt(0)!;
    return point >= 0x1100 && (point <= 0x115f || point === 0x2329 || point === 0x232a ||
        point >= 0x2e80 && point <= 0xa4c6 && point !== 0x303f || point >= 0xa960 && point <= 0xa97c ||
        point >= 0xac00 && point <= 0xd7a3 || point >= 0xf900 && point <= 0xfaff ||
        point >= 0xfe10 && point <= 0xfe6b || point >= 0xff01 && point <= 0xff60 || point >= 0xffe0 && point <= 0xffe6 ||
        point >= 0x1b000 && point <= 0x1b2ff || point >= 0x1f200 && point <= 0x1f251 || point >= 0x20000 && point <= 0x3fffd) ? 2 : 1;
}
/** Measure content rather than ANSI emphasis for aligned panels. @private */
export function terminalWidth(text: string): number {
    return [...segments.segment(plainTerminal(text))].reduce((total, part) => total + cells(part.segment), 0);
}

/** Wrap all content, preserving meaningful indentation and avoiding broken Unicode clusters. @private */
export function wrapTerminal(text: string, width: number): string[] {
    const rows: string[] = [];
    const limit = Math.max(2, width);
    for (const original of plainTerminal(text).split('\n')) {
        let line = ''; let used = 0;
        for (const { segment } of segments.segment(original)) {
            const count = cells(segment);
            if (used + count > limit && line) {
                if (/\s/u.test(segment) && line.trim()) { rows.push(line.trimEnd()); line = ''; used = 0; continue; }
                const boundary = line.lastIndexOf(' ');
                if (boundary > 0 && line.slice(0, boundary).trim()) {
                    rows.push(line.slice(0, boundary).trimEnd());
                    line = line.slice(boundary + 1); used = terminalWidth(line);
                } else { rows.push(line); line = ''; used = 0; }
            }
            line += segment; used += count;
        }
        rows.push(line);
    }
    return rows;
}

/** Apply semantic terminal emphasis only on color-capable pretty output. @private */
export function style(text: string, tone: PresentationTone, presentation: TerminalPresentation): string {
    const value = plainTerminal(text);
    if (!presentation.color || !presentation.pretty) return value;
    const codes: Record<PresentationTone, string> = { title: '1;36', muted: '2', success: '32', warning: '33', error: '1;31', accent: '36' };
    return `\u001b[${codes[tone]}m${value}\u001b[0m`;
}

/** Render a one-shot aligned summary; raw output retains all information without decoration. @private */
export function renderPanel(title: string, rows: readonly (readonly [string, string])[], presentation: TerminalPresentation, options: PanelOptions = {}): string {
    const content = [...rows.map(([label, value]) => `${label}: ${value}`), ...(options.details ?? []), ...(options.next?.length ? ['', ...options.next.map(value => `Next: ${value}`)] : [])];
    if (!presentation.pretty) return `${plainTerminal(title)}\n${content.map(plainTerminal).join('\n')}\n`;
    const width = Math.max(8, presentation.width - 1);
    const inner = width - 4;
    const labelWidth = Math.min(Math.max(0, ...rows.map(([label]) => terminalWidth(label))), Math.floor(inner / 3));
    const lines = rows.flatMap(([label, value]) => {
        if (terminalWidth(label) > labelWidth || inner - labelWidth < 6) return wrapTerminal(`${label}: ${value}`, inner);
        const values = wrapTerminal(value, Math.max(2, inner - labelWidth - 2));
        return values.map((line, index) => `${index ? ' '.repeat(labelWidth + 2) : `${label}${' '.repeat(Math.max(0, labelWidth - terminalWidth(label)))}  `}${line}`);
    });
    lines.push(...(options.details ?? []).flatMap(line => wrapTerminal(line, inner)));
    if (options.next?.length) lines.push('', ...options.next.flatMap(line => wrapTerminal(`Next: ${line}`, inner)));
    const header = wrapTerminal(title, inner);
    const framed = [...header.map(line => `${style('│', 'muted', presentation)} ${style(line, options.tone ?? 'title', presentation)}${' '.repeat(Math.max(0, inner - terminalWidth(line)))} ${style('│', 'muted', presentation)}`),
        style(`├${'─'.repeat(width - 2)}┤`, 'muted', presentation),
        ...lines.map(line => `${style('│', 'muted', presentation)} ${line}${' '.repeat(Math.max(0, inner - terminalWidth(line)))} ${style('│', 'muted', presentation)}`)];
    return `${style(`┌${'─'.repeat(width - 2)}┐`, 'muted', presentation)}\n${framed.join('\n')}\n${style(`└${'─'.repeat(width - 2)}┘`, 'muted', presentation)}\n`;
}

/** Present finite documents with readable sections at the same scope in pretty and raw modes. @private */
export function renderDocument(title: string, sections: readonly DocumentSection[], presentation: TerminalPresentation): string {
    const width = Math.max(8, presentation.width - 1);
    const heading = wrapTerminal(title, width).map(line => style(line, 'title', presentation)).join('\n');
    return `${heading}\n${sections.map(section => {
        const name = wrapTerminal(section.title, width).map(line => style(line, 'accent', presentation)).join('\n');
        const content = section.lines.flatMap(line => wrapTerminal(line, width)).join('\n');
        return `\n${name}${presentation.pretty && name ? `\n${style('─'.repeat(Math.min(width, terminalWidth(section.title))), 'muted', presentation)}` : ''}\n${content}`;
    }).join('\n')}\n`;
}
