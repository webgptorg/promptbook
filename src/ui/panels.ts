import { fit, stringWidth, truncate, type Style } from './ansi.js';

/**
 * Visual tone of a panel border.
 *
 * @private terminal UI
 */
export type PanelTone = 'default' | 'attention' | 'accent' | 'success' | 'error' | 'muted';

/**
 * Box-drawing character set.
 */
type BoxCharacters = { tl: string; tr: string; bl: string; br: string; h: string; v: string };

/**
 * Rounded Unicode box characters.
 */
const ROUNDED: BoxCharacters = { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' };

/**
 * Heavy box characters used for attention panels.
 */
const HEAVY: BoxCharacters = { tl: '┏', tr: '┓', bl: '┗', br: '┛', h: '━', v: '┃' };

/**
 * ASCII fallback.
 */
const ASCII: BoxCharacters = { tl: '+', tr: '+', bl: '+', br: '+', h: '-', v: '|' };

/**
 * Options of one bordered panel.
 *
 * @private terminal UI
 */
export type PanelOptions = {
    /** Title shown in the top border. */
    readonly title: string;
    /** Optional text aligned right in the top border. */
    readonly titleRight?: string;
    /** Content lines (styled); each is fitted to the inner width. */
    readonly lines: readonly string[];
    /** Total width including borders. */
    readonly width: number;
    /** Border tone. */
    readonly tone?: PanelTone;
    /** Unicode box drawing. */
    readonly unicode: boolean;
    /** Styles. */
    readonly style: Style;
    /** Minimal content height (padded with empty lines). */
    readonly minHeight?: number;
};

/**
 * Applies a tone color.
 */
function toneColor(style: Style, tone: PanelTone, text: string): string {
    switch (tone) {
        case 'attention':
            return style.warning(text);
        case 'accent':
            return style.accent(text);
        case 'success':
            return style.success(text);
        case 'error':
            return style.error(text);
        case 'muted':
            return style.muted(text);
        default:
            return style.muted(text);
    }
}

/**
 * Renders a titled, bordered panel as lines of exactly `width` columns.
 *
 * @private terminal UI
 */
export function renderPanel(options: PanelOptions): string[] {
    const tone = options.tone ?? 'default';
    const box = !options.unicode ? ASCII : tone === 'attention' ? HEAVY : ROUNDED;
    const width = Math.max(8, options.width);
    const inner = width - 4;
    const color = (text: string): string => toneColor(options.style, tone, text);
    const titleText = ` ${truncate(options.title, Math.max(1, inner - 2))} `;
    const rightText = options.titleRight ? ` ${truncate(options.titleRight, Math.max(0, inner - stringWidth(titleText) - 3))} ` : '';
    const fill = Math.max(0, width - 3 - stringWidth(titleText) - stringWidth(rightText) - (rightText ? 1 : 0));
    const titleStyled = tone === 'attention' ? options.style.bold(options.style.warning(titleText)) : options.style.bold(titleText);
    const top = color(`${box.tl}${box.h}`) + titleStyled + color(box.h.repeat(fill)) + (rightText ? options.style.muted(rightText) + color(box.h) : '') + color(box.tr);
    const lines = [...options.lines];
    while (lines.length < (options.minHeight ?? 0)) lines.push('');
    const body = lines.map((line) => `${color(box.v)} ${fit(line, inner)} ${color(box.v)}`);
    const bottom = color(`${box.bl}${box.h.repeat(width - 2)}${box.br}`);
    return [top, ...body, bottom];
}

/**
 * Places column blocks side by side, padding shorter columns.
 *
 * @private terminal UI
 */
export function sideBySide(columns: readonly (readonly string[])[], widths: readonly number[], gap = 1): string[] {
    const height = Math.max(...columns.map((column) => column.length));
    const lines: string[] = [];
    for (let row = 0; row < height; row++) {
        lines.push(columns.map((column, index) => fit(column[row] ?? '', widths[index]!)).join(' '.repeat(gap)));
    }
    return lines;
}

