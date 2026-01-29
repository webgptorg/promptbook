import colors from 'colors';
import { formatCommitMessageForDisplay } from './formatCommitMessageForDisplay';

/**
 * Prints the formatted commit message preview.
 */
export function printCommitMessage(message: string): void {
    console.info(colors.cyan('Commit message:'));
    console.info(formatCommitMessageForDisplay(message));
}
