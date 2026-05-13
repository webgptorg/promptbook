import colors from 'colors';
import { centerAnsiText, padAnsiText, visibleLength } from '../../run-codex-prompts/ui/coderRunUiText';

/**
 * Compact 3x5 block font used for agent-name initials in the terminal dashboard.
 */
const BLOCK_FONT: Record<string, readonly string[]> = {
    A: ['███', '█ █', '███', '█ █', '█ █'],
    B: ['██ ', '█ █', '██ ', '█ █', '██ '],
    C: ['███', '█  ', '█  ', '█  ', '███'],
    D: ['██ ', '█ █', '█ █', '█ █', '██ '],
    E: ['███', '█  ', '██ ', '█  ', '███'],
    F: ['███', '█  ', '██ ', '█  ', '█  '],
    G: ['███', '█  ', '█ ██', '█  █', '████'],
    H: ['█ █', '█ █', '███', '█ █', '█ █'],
    I: ['███', ' █ ', ' █ ', ' █ ', '███'],
    J: ['███', '  █', '  █', '█ █', '██ '],
    K: ['█ █', '█ █', '██ ', '█ █', '█ █'],
    L: ['█  ', '█  ', '█  ', '█  ', '███'],
    M: ['█ █', '███', '███', '█ █', '█ █'],
    N: ['█ █', '███', '███', '███', '█ █'],
    O: ['███', '█ █', '█ █', '█ █', '███'],
    P: ['███', '█ █', '███', '█  ', '█  '],
    Q: ['███', '█ █', '█ █', '███', '  █'],
    R: ['███', '█ █', '███', '██ ', '█ █'],
    S: ['███', '█  ', '███', '  █', '███'],
    T: ['███', ' █ ', ' █ ', ' █ ', ' █ '],
    U: ['█ █', '█ █', '█ █', '█ █', '███'],
    V: ['█ █', '█ █', '█ █', '█ █', ' █ '],
    W: ['█ █', '█ █', '███', '███', '█ █'],
    X: ['█ █', '█ █', ' █ ', '█ █', '█ █'],
    Y: ['█ █', '█ █', ' █ ', ' █ ', ' █ '],
    Z: ['███', '  █', ' █ ', '█  ', '███'],
    0: ['███', '█ █', '█ █', '█ █', '███'],
    1: [' ██', '  █', '  █', '  █', '███'],
    2: ['███', '  █', '███', '█  ', '███'],
    3: ['███', '  █', ' ██', '  █', '███'],
    4: ['█ █', '█ █', '███', '  █', '  █'],
    5: ['███', '█  ', '███', '  █', '███'],
    6: ['███', '█  ', '███', '█ █', '███'],
    7: ['███', '  █', '  █', '  █', '  █'],
    8: ['███', '█ █', '███', '█ █', '███'],
    9: ['███', '█ █', '███', '  █', '███'],
};

/**
 * Fallback glyph used when the initials contain unsupported characters.
 */
const UNKNOWN_LETTER = ['███', '  █', ' ██', '   ', ' ██'] as const;

/**
 * Builds a compact centered initials banner for `ptbk agent run`.
 */
export function buildAgentRunInitialsVisual(agentName: string, totalWidth: number): readonly string[] {
    const initials = extractAgentInitials(agentName);
    const glyphRows = Array.from({ length: 5 }, () => '') as string[];

    for (const initial of initials) {
        const glyph = BLOCK_FONT[initial] || UNKNOWN_LETTER;

        for (let rowIndex = 0; rowIndex < glyph.length; rowIndex++) {
            glyphRows[rowIndex] = `${glyphRows[rowIndex]}${glyph[rowIndex]}  `;
        }
    }

    const trimmedGlyphRows = glyphRows.map((glyphRow) => glyphRow.trimEnd());
    const visualWidth = trimmedGlyphRows.reduce((maxWidth, glyphRow) => Math.max(maxWidth, visibleLength(glyphRow)), 0);

    return trimmedGlyphRows.map((glyphRow, rowIndex) => {
        const coloredRow =
            rowIndex === 2 ? colors.cyan.bold(glyphRow) : rowIndex === 0 ? colors.blue.bold(glyphRow) : colors.white.bold(glyphRow);

        return centerAnsiText(padAnsiText(coloredRow, visualWidth), totalWidth);
    });
}

/**
 * Extracts readable initials from the local agent title.
 */
function extractAgentInitials(agentName: string): readonly string[] {
    const normalizedAlphanumericName = agentName.replace(/[^A-Za-z0-9]/gu, '').toUpperCase();
    const words = agentName
        .trim()
        .split(/[^A-Za-z0-9]+/u)
        .filter(Boolean)
        .map((word) => word[0]!.toUpperCase());

    if (words.length > 1) {
        return words.slice(0, 3);
    }

    const fallbackLetters = normalizedAlphanumericName.slice(0, 2).split('');

    return fallbackLetters.length > 0 ? fallbackLetters : ['A'];
}
