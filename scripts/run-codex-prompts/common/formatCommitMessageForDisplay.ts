import colors from 'colors';

/**
 * Formats commit message lines for console display.
 */
export function formatCommitMessageForDisplay(message: string): string {
    const lines = message.split(/\r?\n/);
    return lines.map((line) => colors.bgBlue.white(` ${line} `)).join('\n');
}
