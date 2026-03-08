import colors from 'colors';
import { formatError } from './formatError';

/**
 * Captures a deletion failure for a specific resource.
 * @private type of DeleteOpenAiResources
 */
export type DeletionFailure<TSummary extends { id: string }> = {
    item: TSummary;
    reason: string;
};

/**
 * Result of a bulk deletion run.
 * @private type of DeleteOpenAiResources
 */
export type DeletionResult<TSummary extends { id: string }> = {
    deleted: TSummary[];
    failed: DeletionFailure<TSummary>[];
};

/**
 * Configuration for a sequential deletion task.
 * @private type of DeleteOpenAiResources
 */
export type DeletionTask<TSummary extends { id: string }> = {
    label: string;
    items: TSummary[];
    deleteItem: (item: TSummary) => Promise<void>;
    startIndex?: number;
    totalCount?: number;
};

/**
 * Deletes resources sequentially, logging each deletion outcome.
 * @private function of DeleteOpenAiResources
 */
export async function deleteSequentially<TSummary extends { id: string }>(
    task: DeletionTask<TSummary>,
): Promise<DeletionResult<TSummary>> {
    const deleted: TSummary[] = [];
    const failed: DeletionFailure<TSummary>[] = [];

    const showProgress = task.startIndex !== undefined && task.totalCount !== undefined;
    let currentIndex = task.startIndex ?? 0;

    for (const item of task.items) {
        currentIndex++;
        const progressPrefix = showProgress ? `[${currentIndex}/${task.totalCount}] ` : '';

        console.info(colors.gray(`${progressPrefix}Deleting ${task.label} ${item.id}...`));

        try {
            await task.deleteItem(item);
            // console.info(colors.green(`${progressPrefix}Deleted ${task.label} ${item.id}.`));
            deleted.push(item);
        } catch (error) {
            const reason = formatError(error);
            console.error(colors.red(`${progressPrefix}Failed to delete ${task.label} ${item.id}: ${reason}`));
            failed.push({ item, reason });
        }
    }

    return { deleted, failed };
}

