import type { Observable } from 'rxjs';
import { Subject } from 'rxjs';
import type { PartialDeep } from 'type-fest';
import { assertsError } from '../errors/assertsError';
import type { LlmCall } from '../types/LlmCall';
import type { number_percent } from '../types/number_percent';
import type { task_id } from '../types/string_token';
import type { string_SCREAMING_CASE } from '../utils/normalization/normalizeTo_SCREAMING_CASE';
import type { chococake } from '../utils/organization/really_any';
import type { TODO_any } from '../utils/organization/TODO_any';
import type { TODO_remove_as } from '../utils/organization/TODO_remove_as';
import { $randomToken } from '../utils/random/$randomToken';
import { jsonStringsToJsons } from '../utils/serialization/jsonStringsToJsons';
import type { string_promptbook_version } from '../version';
import { PROMPTBOOK_ENGINE_VERSION } from '../version';
import type { AbstractTaskResult } from './AbstractTaskResult';
import { assertsTaskSuccessful } from './assertsTaskSuccessful';
import type { PipelineExecutorResult } from './PipelineExecutorResult';
import { resolveTaskTldr } from './resolveTaskTldr';

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
 * Shared TLDR structure used by running tasks.
 */
type TaskTldrInfo = {
    readonly percent: number_percent;
    readonly message: string;
};

/**
 * Mutable runtime state backing one task instance.
 */
type TaskState<TTaskResult extends AbstractTaskResult> = {
    title: AbstractTask<TTaskResult>['title'];
    status: task_status;
    updatedAt: Date;
    readonly errors: Array<Error>;
    readonly warnings: Array<Error>;
    readonly llmCalls: Array<LlmCall>;
    currentValue: PartialDeep<TTaskResult>;
    customTldr: TaskTldrInfo | null;
};

/**
 * Partial result update emitted while the task is still running.
 */
type OngoingTaskUpdate<TTaskResult extends AbstractTaskResult> = PartialDeep<TTaskResult> & {
    /**
     * Optional update of the task title
     */
    readonly title?: AbstractTask<TTaskResult>['title'];
};

/**
 * Creates the initial mutable state for a task.
 *
 * @private internal helper function
 */
function createTaskState<TTaskResult extends AbstractTaskResult>(
    title: AbstractTask<TTaskResult>['title'],
    createdAt: Date,
): TaskState<TTaskResult> {
    return {
        title,
        status: 'RUNNING',
        updatedAt: createdAt,
        errors: [],
        warnings: [],
        llmCalls: [],
        currentValue: {} as PartialDeep<TTaskResult>,
        customTldr: null,
    };
}

/**
 * Creates the partial-result updater passed into the task process callback.
 *
 * @private internal helper function
 */
function createOngoingResultUpdater<TTaskResult extends AbstractTaskResult>(
    taskState: TaskState<TTaskResult>,
    partialResultSubject: Subject<PartialDeep<TTaskResult>>,
) {
    return (newOngoingResult: OngoingTaskUpdate<TTaskResult>) => {
        if (newOngoingResult.title) {
            taskState.title = newOngoingResult.title;
        }

        taskState.updatedAt = new Date();

        Object.assign(taskState.currentValue, newOngoingResult);
        // <- TODO: assign deep
        partialResultSubject.next(newOngoingResult);
    };
}

/**
 * Creates the custom-TLDR updater passed into the task process callback.
 *
 * @private internal helper function
 */
function createTldrUpdater<TTaskResult extends AbstractTaskResult>(taskState: TaskState<TTaskResult>) {
    return (tldrInfo: TaskTldrInfo) => {
        taskState.customTldr = tldrInfo;
        taskState.updatedAt = new Date();
    };
}

/**
 * Creates the LLM call logger passed into the task process callback.
 *
 * @private internal helper function
 */
function createLlmCallLogger<TTaskResult extends AbstractTaskResult>(taskState: TaskState<TTaskResult>) {
    return (llmCall: LlmCall) => {
        taskState.llmCalls.push(llmCall);
        taskState.updatedAt = new Date();
    };
}

/**
 * Wires the task promise into the observable/error lifecycle.
 *
 * @private internal helper function
 */
function settleTaskPromise<TTaskResult extends AbstractTaskResult>(
    finalResultPromise: Promise<TTaskResult>,
    taskState: TaskState<TTaskResult>,
    partialResultSubject: Subject<PartialDeep<TTaskResult>>,
): void {
    finalResultPromise
        .catch((error) => {
            taskState.errors.push(error);
            partialResultSubject.error(error);
        })
        .then((executionResult) => {
            if (executionResult) {
                try {
                    finalizeTaskResult(executionResult, taskState, partialResultSubject);
                } catch (error) {
                    failTaskResult(error, taskState, partialResultSubject);
                }
            }

            partialResultSubject.complete();
        });
}

/**
 * Applies the final successful task result into the mutable task state.
 *
 * @private internal helper function
 */
function finalizeTaskResult<TTaskResult extends AbstractTaskResult>(
    executionResult: TTaskResult,
    taskState: TaskState<TTaskResult>,
    partialResultSubject: Subject<PartialDeep<TTaskResult>>,
): void {
    taskState.updatedAt = new Date();

    taskState.errors.push(...executionResult.errors);
    taskState.warnings.push(...executionResult.warnings);
    // <- TODO: [🌂] Only unique errors and warnings should be added (or filtered)

    // TODO: [🧠] !! errors, warning, isSuccessful  are redundant both in `ExecutionTask` and `ExecutionTask.currentValue`
    //            Also maybe move `ExecutionTask.currentValue.usage` -> `ExecutionTask.usage`
    //            And delete `ExecutionTask.currentValue.preparedPipeline`

    assertsTaskSuccessful(executionResult);
    taskState.status = 'FINISHED';

    taskState.currentValue = jsonStringsToJsons(executionResult) as TODO_remove_as<PartialDeep<TTaskResult>>;
    // <- TODO: [🧠] Is this a good idea to convert JSON strins to JSONs?

    partialResultSubject.next(executionResult as chococake);
}

/**
 * Records a final-result failure after the task promise itself resolved.
 *
 * @private internal helper function
 */
function failTaskResult<TTaskResult extends AbstractTaskResult>(
    error: unknown,
    taskState: TaskState<TTaskResult>,
    partialResultSubject: Subject<PartialDeep<TTaskResult>>,
): void {
    assertsError(error);
    taskState.status = 'ERROR';
    taskState.errors.push(error);
    partialResultSubject.error(error);
}

/**
 * Helper to create a new task
 *
 * @private internal helper function
 */
export function createTask<TTaskResult extends AbstractTaskResult>(
    options: CreateTaskOptions<TTaskResult>,
): AbstractTask<TTaskResult> {
    const { taskType, title, taskProcessCallback } = options;

    // TODO: [🐙] DRY
    const taskId = `${taskType.toLowerCase().substring(0, 4)}-${$randomToken(
        8 /* <- TODO: To global config + Use Base58 to avoid similar char conflicts   */,
    )}`;

    const createdAt = new Date();
    const taskState = createTaskState<TTaskResult>(title, createdAt);
    const partialResultSubject = new Subject<PartialDeep<TTaskResult>>();
    // <- Note: Not using `BehaviorSubject` because on error we can't access the last value

    const finalResultPromise = /* not await */ taskProcessCallback(
        createOngoingResultUpdater(taskState, partialResultSubject),
        createTldrUpdater(taskState),
        createLlmCallLogger(taskState),
    );

    settleTaskPromise(finalResultPromise, taskState, partialResultSubject);

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
            return taskState.title;
            // <- Note: [1] These must be getters to allow changing the value in the future
        },
        get status() {
            return taskState.status;
            // <- Note: [1] --||--
        },
        get tldr() {
            return resolveTaskTldr({
                customTldr: taskState.customTldr,
                currentValue: taskState.currentValue as chococake,
                status: taskState.status,
                createdAt,
                errors: taskState.errors,
                warnings: taskState.warnings,
            });
        },
        get createdAt() {
            return createdAt;
            // <- Note: [1] --||--
        },
        get updatedAt() {
            return taskState.updatedAt;
            // <- Note: [1] --||--
        },
        asPromise,
        asObservable() {
            return partialResultSubject.asObservable();
        },
        get errors() {
            return taskState.errors;
            // <- Note: [1] --||--
        },
        get warnings() {
            return taskState.warnings;
            // <- Note: [1] --||--
        },
        get llmCalls() {
            return [...taskState.llmCalls, { foo: '!!! bar' } as TODO_any];
            // <- Note: [1] --||--
        },
        get currentValue() {
            return taskState.currentValue;
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
 *
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
    readonly ptbkNonce?: chococake;

    // <- TODO: asMutableObject(): PartialDeep<TTaskResult>;
};

/**
 * Type describing task.
 */
export type Task = ExecutionTask | PreparationTask;

// TODO: Maybe allow to terminate the task and add getter `isFinished` or `status`
// TODO: [🐚] Split into more files and make `PrepareTask` & `RemoteTask` + split the function
