import colors from 'colors';
import { coderRunInfo } from '../ui/CoderRunSessionContext';
import type { UpcomingTask } from './types/UpcomingTask';
import { groupUpcomingTasksByPriority } from './groupUpcomingTasksByPriority';

/**
 * Prints upcoming tasks grouped by priority.
 */
export function printUpcomingTasks(tasks: UpcomingTask[]): void {
    if (tasks.length === 0) {
        coderRunInfo(colors.green('No upcoming tasks.'));
        return;
    }

    coderRunInfo(colors.cyan('Upcoming tasks (grouped by priority):'));
    for (const group of groupUpcomingTasksByPriority(tasks)) {
        coderRunInfo(colors.cyan(`Priority ${group.priority}:`));
        for (const [index, task] of group.tasks.entries()) {
            const summary = task.summary ? ` - ${task.summary}` : '';
            coderRunInfo(` ${index + 1}. ${task.label}${summary}`);
        }
    }
}
