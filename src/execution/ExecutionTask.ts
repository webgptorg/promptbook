import type { Observable } from 'rxjs';
import { Subject } from 'rxjs';
import { PartialDeep } from 'type-fest';
import { DEFAULT_TASK_SIMULATED_DURATION_MS } from '../config';
import { assertsError } from '../errors/assertsError';
import type { LlmCall } from '../types/LlmCall';
import type { number_percent, task_id } from '../types/typeAliases';
import type { string_SCREAMING_CASE } from '../utils/normalization/normalizeTo_SCREAMING_CASE';
import type { TODO_remove_as } from '../utils/organization/TODO_remove_as';
import type { really_any } from '../utils/organization/really_any';
import { $randomToken } from '../utils/random/$randomToken';
import { jsonStringsToJsons } from '../utils/serialization/jsonStringsToJsons';
import type { string_promptbook_version } from '../version';
import { PROMPTBOOK_ENGINE_VERSION } from '../version';
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
     * Human-readable title of the task - used for displaying in the UI
     */
    readonly title: AbstractTask<TTaskResult>['title'];

    /**
     * Callback that processes the task and updates the ongoing result
     * @param updateOngoingResult Function to update the partial result of the task processing
     * @param updateTldr Function to update tldr progress information
     * @returns The final task result
     */
    taskProcessCallback(
        updateOngoingResult: (
            newOngoingResult: PartialDeep<TTaskResult> & {
                /**
                 * Optional update of the task title
                 */
                readonly title?: AbstractTask<TTaskResult>['title'];
            },
        ) => void,
        updateTldr: (tldrInfo: { readonly percent: number_percent; readonly message: string }) => void,
        logLlmCall: (llmCall: LlmCall) => void,
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
    let { title } = options;

    // TODO: [🐙] DRY
    const taskId = `${taskType.toLowerCase().substring(0, 4)}-${$randomToken(
        8 /* <- TODO: To global config + Use Base58 to avoid similar char conflicts   */,
    )}`;

    let status: task_status = 'RUNNING';
    const createdAt = new Date();
    let updatedAt = createdAt;
    const errors: Array<Error> = [];
    const warnings: Array<Error> = [];
    const llmCalls: Array<LlmCall> = [];
    let currentValue = {} as PartialDeep<TTaskResult>;
    let customTldr: { readonly percent: number_percent; readonly message: string } | null = null;
    const partialResultSubject = new Subject<PartialDeep<TTaskResult>>();
    // <- Note: Not using `BehaviorSubject` because on error we can't access the last value

    const finalResultPromise = /* not await */ taskProcessCallback(
        (newOngoingResult) => {
            if (newOngoingResult.title) {
                title = newOngoingResult.title;
            }

            updatedAt = new Date();

            Object.assign(currentValue, newOngoingResult);
            // <- TODO: assign deep
            partialResultSubject.next(newOngoingResult);
        },
        (tldrInfo) => {
            customTldr = tldrInfo;
            updatedAt = new Date();
        },
        (llmCall) => {
            llmCalls.push(llmCall);
            updatedAt = new Date();
        },
    );

    finalResultPromise
        .catch((error) => {
            errors.push(error);
            partialResultSubject.error(error);
        })
        .then((executionResult) => {
            if (executionResult) {
                try {
                    updatedAt = new Date();

                    errors.push(...executionResult.errors);
                    warnings.push(...executionResult.warnings);
                    // <- TODO: [🌂] Only unique errors and warnings should be added (or filtered)

                    // TODO: [🧠] !! errors, warning, isSuccessful  are redundant both in `ExecutionTask` and `ExecutionTask.currentValue`
                    //            Also maybe move `ExecutionTask.currentValue.usage` -> `ExecutionTask.usage`
                    //            And delete `ExecutionTask.currentValue.preparedPipeline`

                    assertsTaskSuccessful(executionResult);
                    status = 'FINISHED';

                    currentValue = jsonStringsToJsons(executionResult) as TODO_remove_as<PartialDeep<TTaskResult>>;
                    // <- TODO: [🧠] Is this a good idea to convert JSON strins to JSONs?

                    partialResultSubject.next(executionResult as really_any);
                } catch (error) {
                    assertsError(error);
                    status = 'ERROR';
                    errors.push(error);
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
        get promptbookVersion() {
            return PROMPTBOOK_ENGINE_VERSION;
        },
        get title() {
            return title;
            // <- Note: [1] These must be getters to allow changing the value in the future
        },
        get status() {
            return status;
            // <- Note: [1] --||--
        },
        get tldr() {
            // Use custom tldr if available
            if (customTldr) {
                return customTldr;
            }

            // Fallback to default implementation
            const cv: really_any = currentValue as really_any;

            // If explicit percent is provided, use it
            let percentRaw: unknown = cv?.tldr?.percent ?? cv?.usage?.percent ?? cv?.progress?.percent ?? cv?.percent;

            // Simulate progress if not provided
            if (typeof percentRaw !== 'number') {
                // Simulate progress: evenly split across subtasks, based on elapsed time
                const now = new Date();
                const elapsedMs = now.getTime() - createdAt.getTime();
                const totalMs = DEFAULT_TASK_SIMULATED_DURATION_MS;

                // If subtasks are defined, split progress evenly
                const subtaskCount = Array.isArray(cv?.subtasks) ? cv.subtasks.length : 1;
                const completedSubtasks = Array.isArray(cv?.subtasks)
                    ? cv.subtasks.filter((s: { done?: boolean; completed?: boolean }) => s.done || s.completed).length
                    : 0;

                // Progress from completed subtasks
                const subtaskProgress = subtaskCount > 0 ? completedSubtasks / subtaskCount : 0;

                // Progress from elapsed time for current subtask
                const timeProgress = Math.min(elapsedMs / totalMs, 1);

                // Combine: completed subtasks + time progress for current subtask
                percentRaw = Math.min(subtaskProgress + (1 / subtaskCount) * timeProgress, 1);
                if (status === 'FINISHED') percentRaw = 1;
                if (status === 'ERROR') percentRaw = 0;
            }

            // Clamp to [0,1]
            let percent = Number(percentRaw) || 0;
            if (percent < 0) percent = 0;
            if (percent > 1) percent = 1;

            // Build a short message: prefer explicit tldr.message, then common summary/message fields, then errors/warnings, then status
            const messageFromResult = cv?.tldr?.message ?? cv?.message ?? cv?.summary ?? cv?.statusMessage;
            let message: string | undefined = messageFromResult;
            if (!message) {
                // If subtasks, show current subtask
                if (Array.isArray(cv?.subtasks) && cv.subtasks.length > 0) {
                    const current = cv.subtasks.find(
                        (s: { done?: boolean; completed?: boolean; title?: string }) => !s.done && !s.completed,
                    );
                    if (current && current.title) {
                        message = `Working on ${current.title}`;
                    }
                }
                if (!message) {
                    if (errors.length) {
                        message = errors[errors.length - 1]!.message || 'Error';
                    } else if (warnings.length) {
                        message = warnings[warnings.length - 1]!.message || 'Warning';
                    } else if (status === 'FINISHED') {
                        message = 'Finished';
                    } else if (status === 'ERROR') {
                        message = 'Error';
                    } else {
                        message = 'Running';
                    }
                }
            }

            return {
                percent: percent as number_percent,
                message,
            };
        },
        get createdAt() {
            return createdAt;
            // <- Note: [1] --||--
        },
        get updatedAt() {
            return updatedAt;
            // <- Note: [1] --||--
        },
        asPromise,
        asObservable() {
            return partialResultSubject.asObservable();
        },
        get errors() {
            return errors;
            // <- Note: [1] --||--
        },
        get warnings() {
            return warnings;
            // <- Note: [1] --||--
        },
        get llmCalls() {
            return llmCalls;
            // <- Note: [1] --||--
        },
        get currentValue() {
            return currentValue;
            // <- Note: [1] --||--
        },
    } satisfies AbstractTask<TTaskResult>;
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
 * Status of a task
 */
export type task_status =
    | 'RUNNING' /* TODO: | 'WAITING' */
    | 'FINISHED'
    | 'ERROR' /* TODO: | 'CANCELED' | 'SUSPENDED' */;

/**
 * Base interface for all task types
 */
export type AbstractTask<TTaskResult extends AbstractTaskResult> = {
    /**
     * Type of the task
     */
    readonly taskType: string_SCREAMING_CASE;

    /**
     * Version of the promptbook used to run the task
     */
    readonly promptbookVersion: string_promptbook_version;

    /**
     * Unique identifier for the task
     */
    readonly taskId: task_id;

    /**
     * Human-readable title of the task - used for displaying in the UI
     *
     * For example name of the book which is being executed
     */
    readonly title: string;

    // <- TODO: [🧠] Maybe also `pipelineUrl` here

    /**
     * Status of the task
     */
    readonly status: task_status;

    /**
     * Short summary of the task status for quick overview in the UI
     */
    readonly tldr: {
        /**
         * Progress in percentage from 0 to 1 (100%) that can be used to display a progress bar
         */
        readonly percent: number_percent;

        /**
         * Short summary message of the task status that can be displayed in the UI
         */
        readonly message: string;
    };

    /**
     * Date when the task was created
     */
    readonly createdAt: Date;

    /**
     * Date when the task was last updated
     */
    readonly updatedAt: Date;

    /**
     * Gets a promise that resolves with the task result
     */
    asPromise(options?: {
        /**
         * Do the task throws on error
         *
         * - If `true` when error occurs the returned promise will rejects
         * - If `false` the promise will resolve with object with all listed errors and warnings and partial result
         *
         * @default true
         */
        readonly isCrashedOnError?: boolean;
    }): Promise<TTaskResult>;

    /**
     * Gets an observable stream of partial task results
     */
    asObservable(): Observable<PartialDeep<TTaskResult>>;

    /**
     * Gets just the current value which is mutated during the task processing
     */
    readonly currentValue: PartialDeep<TTaskResult>;

    /**
     * List of errors that occurred during the task processing
     */
    readonly errors: Array<Error>;

    /**
     * List of warnings that occurred during the task processing
     */
    readonly warnings: Array<Error>;

    /**
     * List of LLM calls that occurred during the task processing
     */
    readonly llmCalls: Array<LlmCall>;

    /**
     * Optional nonce to correlate logs with version of the Promptbook engine
     */
    readonly ptbkNonce?: really_any;

    // <- TODO: asMutableObject(): PartialDeep<TTaskResult>;
};

export type Task = ExecutionTask | PreparationTask;

/**
 * TODO: Maybe allow to terminate the task and add getter `isFinished` or `status`
 * TODO: [🐚] Split into more files and make `PrepareTask` & `RemoteTask` + split the function
 */
