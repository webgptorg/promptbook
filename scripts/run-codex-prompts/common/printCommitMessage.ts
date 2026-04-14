import colors from 'colors';
import { coderRunInfo } from '../ui/CoderRunSessionContext';
import { formatCommitMessageForDisplay } from './formatCommitMessageForDisplay';

/**
 * Prints the formatted commit message preview.
 */
export function printCommitMessage(message: string): void {
    coderRunInfo(colors.cyan('Commit message:'));
    coderRunInfo(formatCommitMessageForDisplay(message));
}
