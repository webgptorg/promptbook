import type { Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import { PartialDeep } from 'type-fest';
import type { task_id } from '../types/typeAliases';
import type { string_SCREAMING_CASE } from '../utils/normalization/normalizeTo_SCREAMING_CASE';
import type { TODO_remove_as } from '../utils/organization/TODO_remove_as';
import type { really_any } from '../utils/organization/really_any';
import { $randomToken } from '../utils/random/$randomToken';
import type { AbstractTaskResult } from './AbstractTaskResult';
import type { PipelineExecutorResult } from './PipelineExecutorResult';
import { assertsTaskSuccessful } from './assertsTaskSuccessful';

/**
 * Options for creating a new task
 */
type CreateTaskOptions<TTaskResult extends AbstractTaskResult> = {
    /**
     * The type of task to create
     */
    readonly taskType: AbstractTask<TTaskResult>['taskType'];

    /**
     * Callback that processes the task and updates the ongoing result
     * @param ongoingResult The partial result of the task processing
     * @returns The final task result
     */
    taskProcessCallback(
        updateOngoingResult: (newOngoingResult: PartialDeep<TTaskResult>) => void,
    ): Promise<TTaskResult>;
};

/**
 * Helper to create a new task
 *
 * @private internal helper function
 */
export function createTask<TTaskResult extends AbstractTaskResult>(
    options: CreateTaskOptions<TTaskResult>,
): AbstractTask<TTaskResult> {
    const { taskType, taskProcessCallback } = options;

    const taskId = `${taskType.toLowerCase().substring(0, 4)}-${$randomToken(
        8 /* <- TODO: !!! To global config + Use Base58 to avoid simmilar char conflicts   */,
    )}`;

    const partialResultSubject = new BehaviorSubject<PartialDeep<TTaskResult>>({} as PartialDeep<TTaskResult>);

    const finalResultPromise = /* not await */ taskProcessCallback((newOngoingResult: PartialDeep<TTaskResult>) => {
        partialResultSubject.next(newOngoingResult);
    });

    finalResultPromise
        .catch((error) => {
            partialResultSubject.error(error);
        })
        .then((value) => {
            if (value) {
                try {
                    assertsTaskSuccessful(value);
                    partialResultSubject.next(value as really_any);
                } catch (error) {
                    partialResultSubject.error(error);
                }
            }

            partialResultSubject.complete();
        });

    async function asPromise(options?: { readonly isCrashedOnError?: boolean }) {
        const { isCrashedOnError = true } = options || {};

        const finalResult = await finalResultPromise;

        if (isCrashedOnError) {
            assertsTaskSuccessful(finalResult);
        }

        return finalResult;
    }

    return {
        taskType,
        taskId,
        asPromise,
        asObservable() {
            return partialResultSubject.asObservable();
        },
        get currentValue() {
            return partialResultSubject.value;
        },
    } as TODO_remove_as<AbstractTask<TTaskResult>>;
}

/**
 * Represents a task that executes a pipeline
 */
export type ExecutionTask = AbstractTask<PipelineExecutorResult> & {
    readonly taskType: 'EXECUTION';
    readonly taskId: `exec-${task_id}`; // <- Note: This is an exception to use shortcuts
};

/**
 * Represents a task that prepares a pipeline
 * @deprecated TODO: [🐚] Currently unused - use
 */
export type PreparationTask = AbstractTask<PipelineExecutorResult> & {
    readonly taskType: 'PREPARATION';
    readonly taskId: `prep-${task_id}`; // <- Note: This is an exception to use shortcuts
};

/**
 * Base interface for all task types
 */
export type AbstractTask<TTaskResult extends AbstractTaskResult> = {
    /**
     * Type of the task
     */
    readonly taskType: string_SCREAMING_CASE;

    /**
     * Unique identifier for the task
     */
    readonly taskId: task_id;

    /**
     * Gets a promise that resolves with the task result
     */
    asPromise(options?: { readonly isCrashedOnError?: boolean }): Promise<TTaskResult>;

    /**
     * Gets an observable stream of partial task results
     */
    asObservable(): Observable<PartialDeep<TTaskResult>>;

    /**
     * Gets just the current value which is mutated during the task processing
     */
    currentValue: PartialDeep<TTaskResult>;

    // <- TODO: asMutableObject(): PartialDeep<TTaskResult>;
};

export type Task = ExecutionTask | PreparationTask;

/**
 * TODO: Maybe allow to terminate the task and add getter `isFinished` or `status`
 * TODO: [🐚] Split into more files and make `PrepareTask` & `RemoteTask` + split the function
 */
