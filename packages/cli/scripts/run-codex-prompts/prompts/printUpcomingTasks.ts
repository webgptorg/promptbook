import colors from 'colors';
import type { UpcomingTask } from './types/UpcomingTask';
import { groupUpcomingTasksByPriority } from './groupUpcomingTasksByPriority';

/**
 * Prints upcoming tasks grouped by priority.
 */
export function printUpcomingTasks(tasks: UpcomingTask[]): void {
    if (tasks.length === 0) {
        console.info(colors.green('No upcoming tasks.'));
        return;
    }

    console.info(colors.cyan('Upcoming tasks (grouped by priority):'));
    for (const group of groupUpcomingTasksByPriority(tasks)) {
        console.info(colors.cyan(`Priority ${group.priority}:`));
        for (const [index, task] of group.tasks.entries()) {
            const summary = task.summary ? ` - ${task.summary}` : '';
            console.info(` ${index + 1}. ${task.label}${summary}`);
        }
    }
}
