import type { UpcomingTask } from './types/UpcomingTask';

/**
 * Groups upcoming tasks by priority, high to low.
 */
export function groupUpcomingTasksByPriority(tasks: UpcomingTask[]): Array<{ priority: number; tasks: UpcomingTask[] }> {
    const grouped = new Map<number, UpcomingTask[]>();
    for (const task of tasks) {
        const group = grouped.get(task.priority);
        if (group) {
            group.push(task);
        } else {
            grouped.set(task.priority, [task]);
        }
    }

    return Array.from(grouped.entries())
        .sort((a, b) => b[0] - a[0])
        .map(([priority, groupedTasks]) => ({ priority, tasks: groupedTasks }));
}
