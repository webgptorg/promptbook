import type { Observable } from 'rxjs';
import { Subject } from 'rxjs';
import { PartialDeep } from 'type-fest';
import { assertsError } from '../errors/assertsError';
import type { number_percent } from '../types/typeAliases';
import type { task_id } from '../types/typeAliases';
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
     * @param ongoingResult The partial result of the task processing
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
    let currentValue = {} as PartialDeep<TTaskResult>;
    const partialResultSubject = new Subject<PartialDeep<TTaskResult>>();
    // <- Note: Not using `BehaviorSubject` because on error we can't access the last value

    const finalResultPromise = /* not await */ taskProcessCallback((newOngoingResult) => {
        if (newOngoingResult.title) {
            title = newOngoingResult.title;
        }

        updatedAt = new Date();

        Object.assign(currentValue, newOngoingResult);
        // <- TODO: assign deep
        partialResultSubject.next(newOngoingResult);
    });

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
            // Derive a short progress summary from currentValue, status and any errors/warnings.
            const cv: really_any = currentValue as really_any;

            // Try several common places where a percent might be stored on the partial result
            let percentRaw: unknown = cv?.tldr?.percent ?? cv?.usage?.percent ?? cv?.progress?.percent ?? cv?.percent;

            // If we didn't find a numeric percent, infer from status
            if (typeof percentRaw !== 'number') {
                if (status === 'FINISHED') {
                    percentRaw = 1;
                } else if (status === 'ERROR') {
                    percentRaw = 0;
                } else {
                    percentRaw = 0;
                }
            }

            // Clamp to [0,1]
            let percent = Number(percentRaw) || 0;
            if (percent < 0) percent = 0;
            if (percent > 1) percent = 1;

            // Build a short message: prefer explicit tldr.message, then common summary/message fields, then errors/warnings, then status
            const messageFromResult = cv?.tldr?.message ?? cv?.message ?? cv?.summary ?? cv?.statusMessage;
            let message: string | undefined = messageFromResult;
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
    asPromise(options?: { readonly isCrashedOnError?: boolean }): Promise<TTaskResult>;

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

    // <- TODO: asMutableObject(): PartialDeep<TTaskResult>;
};

export type Task = ExecutionTask | PreparationTask;

/**
 * TODO: Maybe allow to terminate the task and add getter `isFinished` or `status`
 * TODO: [🐚] Split into more files and make `PrepareTask` & `RemoteTask` + split the function
 */
