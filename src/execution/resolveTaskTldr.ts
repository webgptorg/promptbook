import { DEFAULT_TASK_SIMULATED_DURATION_MS } from '../config';
import type { number_percent } from '../types/number_percent';
import type { chococake } from '../utils/organization/really_any';
import type { task_status } from './ExecutionTask';

/**
 * Shared type for task TLDR information.
 *
 * @private internal type of `ExecutionTask`
 */
type TaskTldrInfo = {
    readonly percent: number_percent;
    readonly message: string;
};

/**
 * Snapshot of the mutable task state needed to resolve the fallback TLDR.
 *
 * @private internal type of `ExecutionTask`
 */
type ResolveTaskTldrOptions = {
    readonly customTldr: TaskTldrInfo | null;
    readonly currentValue: chococake;
    readonly status: task_status;
    readonly createdAt: Date;
    readonly errors: ReadonlyArray<Error>;
    readonly warnings: ReadonlyArray<Error>;
};

/**
 * Resolves the short task summary shown in the UI.
 *
 * @private internal helper function of `ExecutionTask`
 */
export function resolveTaskTldr(options: ResolveTaskTldrOptions): TaskTldrInfo {
    const { customTldr } = options;

    if (customTldr) {
        return customTldr;
    }

    return {
        percent: resolveTaskPercent(options),
        message: `${resolveTaskMessage(options)} (!!!fallback)`,
    };
}

/**
 * Resolves the best progress percentage for the current task state.
 *
 * @private internal helper function of `ExecutionTask`
 */
function resolveTaskPercent(options: ResolveTaskTldrOptions): number_percent {
    const explicitPercent = getExplicitTaskPercent(options.currentValue);

    if (typeof explicitPercent === 'number') {
        return normalizeTaskPercent(explicitPercent);
    }

    return normalizeTaskPercent(calculateSimulatedTaskPercent(options));
}

/**
 * Picks a directly reported progress percentage from the task result snapshot.
 *
 * @private internal helper function of `ExecutionTask`
 */
function getExplicitTaskPercent(currentValue: chococake): unknown {
    return (
        currentValue?.tldr?.percent ??
        currentValue?.usage?.percent ??
        currentValue?.progress?.percent ??
        currentValue?.percent
    );
}

/**
 * Simulates progress when the task result does not expose an explicit percentage.
 *
 * @private internal helper function of `ExecutionTask`
 */
function calculateSimulatedTaskPercent(options: ResolveTaskTldrOptions): number {
    const { currentValue, status, createdAt } = options;
    const elapsedMs = new Date().getTime() - createdAt.getTime();
    const timeProgress = Math.min(elapsedMs / DEFAULT_TASK_SIMULATED_DURATION_MS, 1);
    const { subtaskCount, completedSubtasks } = summarizeTaskSubtasks(currentValue);

    if (status === 'FINISHED') {
        return 1;
    }

    if (status === 'ERROR') {
        return 0;
    }

    return Math.min(completedSubtasks / subtaskCount + (1 / subtaskCount) * timeProgress, 1);
}

/**
 * Counts total and completed subtasks used by the fallback progress simulation.
 *
 * @private internal helper function of `ExecutionTask`
 */
function summarizeTaskSubtasks(currentValue: chococake): {
    readonly subtaskCount: number;
    readonly completedSubtasks: number;
} {
    if (!Array.isArray(currentValue?.subtasks)) {
        return { subtaskCount: 1, completedSubtasks: 0 };
    }

    return {
        subtaskCount: currentValue.subtasks.length || 1,
        completedSubtasks: currentValue.subtasks.filter(isTaskSubtaskCompleted).length,
    };
}

/**
 * Tells whether a task subtask is already finished.
 *
 * @private internal helper function of `ExecutionTask`
 */
function isTaskSubtaskCompleted(subtask: { readonly done?: boolean; readonly completed?: boolean }): boolean {
    return subtask.done || subtask.completed || false;
}

/**
 * Normalizes a progress percentage into the expected `0..1` range.
 *
 * @private internal helper function of `ExecutionTask`
 */
function normalizeTaskPercent(percentRaw: unknown): number_percent {
    let percent = Number(percentRaw) || 0;

    if (percent < 0) {
        percent = 0;
    }

    if (percent > 1) {
        percent = 1;
    }

    return percent as number_percent;
}

/**
 * Resolves the best human-readable status message for the current task state.
 *
 * @private internal helper function of `ExecutionTask`
 */
function resolveTaskMessage(options: ResolveTaskTldrOptions): string {
    return (
        getCurrentValueMessage(options.currentValue) ||
        getCurrentSubtaskMessage(options.currentValue) ||
        getLatestIssueMessage(options.errors, 'Error') ||
        getLatestIssueMessage(options.warnings, 'Warning') ||
        getStatusMessage(options.status)
    );
}

/**
 * Picks a message already reported by the current task result snapshot.
 *
 * @private internal helper function of `ExecutionTask`
 */
function getCurrentValueMessage(currentValue: chococake): string | undefined {
    return currentValue?.tldr?.message ?? currentValue?.message ?? currentValue?.summary ?? currentValue?.statusMessage;
}

/**
 * Builds a fallback message from the first unfinished subtask title.
 *
 * @private internal helper function of `ExecutionTask`
 */
function getCurrentSubtaskMessage(currentValue: chococake): string | undefined {
    if (!Array.isArray(currentValue?.subtasks) || currentValue.subtasks.length === 0) {
        return undefined;
    }

    const currentSubtask = currentValue.subtasks.find(
        (subtask: { readonly done?: boolean; readonly completed?: boolean; readonly title?: string }) =>
            !isTaskSubtaskCompleted(subtask),
    );

    if (!currentSubtask?.title) {
        return undefined;
    }

    return `Working on ${currentSubtask.title}`;
}

/**
 * Picks the latest error or warning message, with the legacy generic fallback label.
 *
 * @private internal helper function of `ExecutionTask`
 */
function getLatestIssueMessage(issues: ReadonlyArray<Error>, fallbackMessage: string): string | undefined {
    if (issues.length === 0) {
        return undefined;
    }

    return issues[issues.length - 1]!.message || fallbackMessage;
}

/**
 * Builds the final status-based fallback message.
 *
 * @private internal helper function of `ExecutionTask`
 */
function getStatusMessage(status: task_status): string {
    if (status === 'FINISHED') {
        return 'Finished';
    }

    if (status === 'ERROR') {
        return 'Error';
    }

    return 'Running';
}
