import colors from 'colors';
import { DeletionFailure, DeletionResult } from './deleteSequentially';

/**
 * Logs a summary of deletion successes and failures.
 * @private function of DeleteOpenAiResources
 */
export function logDeletionSummary<TSummary extends { id: string }>(
    label: string,
    result: DeletionResult<TSummary>,
): void {
    console.info(colors.cyan(`Deleted ${result.deleted.length} ${label}(s).`));

    if (result.failed.length > 0) {
        console.info(colors.red(`Failed to delete ${result.failed.length} ${label}(s):`));

        for (const failure of result.failed) {
            console.info(`- ${formatDeletionFailure(failure)}`);
        }
    }
}

/**
 * Formats a deletion failure into a single display line.
 * @private function of DeleteOpenAiResources
 */
function formatDeletionFailure<TSummary extends { id: string }>(failure: DeletionFailure<TSummary>): string {
    return `${failure.item.id}: ${failure.reason}`;
}

