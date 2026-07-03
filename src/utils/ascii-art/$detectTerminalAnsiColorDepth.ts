import type { AsciiArtColorDepth } from './convertImageDataToAsciiArt';

/**
 * Detects the ANSI color depth supported by the current terminal.
 *
 * Prefers 24-bit true color when the environment advertises it (modern terminals such as
 * Windows Terminal, ConEmu, VS Code, mintty, iTerm2, and WezTerm) and falls back to the
 * portable 256-color palette otherwise.
 *
 * Note: `$` is used to indicate that this function is not a pure function - it reads the process environment
 *
 * @returns Color depth usable by `convertImageDataToAsciiArt`
 *
 * @private within the repository
 */
export function $detectTerminalAnsiColorDepth(): AsciiArtColorDepth {
    if (typeof process === 'undefined' || !process.env) {
        return 'ANSI_256';
    }

    const colorTerm = (process.env.COLORTERM || '').toLowerCase();
    if (colorTerm.includes('truecolor') || colorTerm.includes('24bit')) {
        return 'TRUE_COLOR';
    }

    if (process.env.WT_SESSION !== undefined) {
        return 'TRUE_COLOR'; // <- Note: Windows Terminal always supports true color but does not set COLORTERM
    }

    if (process.env.ConEmuANSI === 'ON') {
        return 'TRUE_COLOR';
    }

    const termProgram = process.env.TERM_PROGRAM || '';
    if (['vscode', 'iTerm.app', 'WezTerm', 'ghostty', 'Hyper'].includes(termProgram)) {
        return 'TRUE_COLOR';
    }

    const term = (process.env.TERM || '').toLowerCase();
    if (term.includes('truecolor') || term.includes('24bit') || term.includes('direct')) {
        return 'TRUE_COLOR';
    }

    return 'ANSI_256';
}
