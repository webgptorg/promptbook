import { spaceTrim } from 'spacetrim';
import type { PartialDeep, Promisable, ReadonlyDeep, WritableDeep } from 'type-fest';
import { assertsError } from '../../errors/assertsError';
import { ExpectError } from '../../errors/ExpectError';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import { UnexpectedError } from '../../errors/UnexpectedError';
import { serializeError } from '../../errors/utils/serializeError';
import { getSingleLlmExecutionTools } from '../../llm-providers/_multiple/getSingleLlmExecutionTools';
import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';
import type { TaskJson } from '../../pipeline/PipelineJson/TaskJson';
import type { LlmCall } from '../../types/LlmCall';
import type { ModelRequirements } from '../../types/ModelRequirements';
import type { Parameters } from '../../types/Parameters';
import type { ChatPrompt, CompletionPrompt, Prompt } from '../../types/Prompt';
import type { string_parameter_name } from '../../types/string_name';
import { arrayableToArray } from '../../utils/misc/arrayableToArray';
import { keepTypeImported } from '../../utils/organization/keepTypeImported';
import type { chococake } from '../../utils/organization/really_any';
import type { TODO_any } from '../../utils/organization/TODO_any';
import type { TODO_string } from '../../utils/organization/TODO_string';
import { templateParameters } from '../../utils/parameters/templateParameters';
import { $deepFreeze } from '../../utils/serialization/$deepFreeze';
import type { ExecutionReportJson } from '../execution-report/ExecutionReportJson';
import type { LlmExecutionTools } from '../LlmExecutionTools';
import type { PipelineExecutorResult } from '../PipelineExecutorResult';
import { validatePromptResult } from '../utils/validatePromptResult';
import type { $OngoingTaskResult } from './$OngoingTaskResult';
import type { CreatePipelineExecutorOptions } from './00-CreatePipelineExecutorOptions';

keepTypeImported<ModelRequirements>();

/**
 * Options for executing attempts of a pipeline task, including configuration for jokers, priority,
 * maximum attempts, prepared content, parameters, the task itself, the prepared pipeline, execution report,
 * and pipeline identification. Used internally by the pipeline executor.
 *
 * @private internal type of `executeAttempts`
 */
export type ExecuteAttemptsOptions = Required<Omit<CreatePipelineExecutorOptions, 'pipeline'>> & {
    /**
     * Names of parameters that act as jokers, which can be used to bypass normal execution if their value meets requirements.
     */
    readonly jokerParameterNames: Readonly<ReadonlyArray<string_parameter_name>>;

    /**
     * Priority of the current execution attempt, used to influence UI or execution order.
     */
    readonly priority: number;

    /**
     * Maximum number of attempts allowed for this task, including retries and joker attempts.
     * Note: [💂] There are two distinct variables
     * 1) `maxExecutionAttempts` - attempts for LLM model
     * 2) `maxAttempts` - attempts for any task (LLM, SCRIPT, DIALOG, etc.)
     */
    readonly maxAttempts: number;

    /**
     * The content prepared for execution, with parameters already substituted.
     */
    readonly preparedContent: TODO_string;

    /**
     * The parameters provided for this execution attempt.
     */
    readonly parameters: Readonly<Parameters>;

    /**
     * The task being executed, as a deeply immutable TaskJson object.
     * Note: Naming should be unified between `task` and `currentTask`.
     */
    readonly task: ReadonlyDeep<TaskJson>;
    //       <- TODO: [🕉] `task` vs `currentTask` - unite naming

    /**
     * The pipeline structure prepared for execution, as a deeply immutable PipelineJson object.
     */
    readonly preparedPipeline: ReadonlyDeep<PipelineJson>;

    /**
     * Callback invoked with partial results as the execution progresses.
     */
    onProgress(newOngoingResult: PartialDeep<PipelineExecutorResult>): Promisable<void>;

    /**
     * Optional callback invoked with each LLM call.
     */
    logLlmCall?(llmCall: LlmCall): Promisable<void>;

    /**
     * The execution report object, which is updated during execution.
     */
    readonly $executionReport: WritableDeep<ExecutionReportJson>;

    /**
     * String identifier for the pipeline, used for logging and error reporting.
     */
    readonly pipelineIdentification: string;
};

/**
 * Describes one execution-loop iteration, including whether it is a joker shortcut or a regular retry.
 */
type AttemptDescriptor = {
    /**
     * Zero-based retry index, with negative values reserved for joker attempts.
     */
    readonly attemptIndex: number;

    /**
     * Indicates whether the current iteration should short-circuit through a joker parameter.
     */
    readonly isJokerAttempt: boolean;

    /**
     * Joker parameter used by the current iteration, when applicable.
     */
    readonly jokerParameterName?: string_parameter_name;
};

/**
 * Shared runtime state for executing a single attempt.
 */
type ExecuteSingleAttemptOptions = {
    /**
     * Metadata describing the current loop iteration.
     */
    readonly attempt: AttemptDescriptor;

    /**
     * Immutable executor options shared across all attempts.
     */
    readonly options: ExecuteAttemptsOptions;

    /**
     * Narrowed LLM execution tools for prompt tasks.
     */
    readonly llmTools: LlmExecutionTools;

    /**
     * Mutable per-task state accumulated across attempts.
     */
    readonly $ongoingTaskResult: $OngoingTaskResult;
};

/**
 * Readonly prompt-task shape used by prompt-specific helpers.
 */
type PromptTask = ReadonlyDeep<Extract<TaskJson, { taskType: 'PROMPT_TASK' }>>;

/**
 * Readonly script-task shape used by script-specific helpers.
 */
type ScriptTask = ReadonlyDeep<Extract<TaskJson, { taskType: 'SCRIPT_TASK' }>>;

/**
 * Readonly dialog-task shape used by dialog-specific helpers.
 */
type DialogTask = ReadonlyDeep<Extract<TaskJson, { taskType: 'DIALOG_TASK' }>>;

/**
 * Executes a pipeline task with multiple attempts, including joker and retry logic. Handles different task types
 * (prompt, script, dialog, etc.), applies postprocessing, checks expectations, and updates the execution report.
 * Throws errors if execution fails after all attempts.
 *
 * @param options - The options for execution, including task, parameters, pipeline, and configuration.
 * @returns The result string of the executed task.
 *
 * @private internal utility of `createPipelineExecutor`
 */
export async function executeAttempts(options: ExecuteAttemptsOptions): Promise<TODO_string> {
    const $ongoingTaskResult = createOngoingTaskResult();
    const llmTools: LlmExecutionTools = getSingleLlmExecutionTools(options.tools.llm);

    attempts: for (
        let attemptIndex: number = -options.jokerParameterNames.length;
        attemptIndex < options.maxAttempts;
        attemptIndex++
    ) {
        const attempt = createAttemptDescriptor({
            attemptIndex,
            jokerParameterNames: options.jokerParameterNames,
            pipelineIdentification: options.pipelineIdentification,
        });

        resetAttemptExecutionState($ongoingTaskResult);

        try {
            await executeSingleAttempt({
                attempt,
                options,
                llmTools,
                $ongoingTaskResult,
            });
            break attempts;
        } catch (error) {
            if (!(error instanceof ExpectError)) {
                throw error;
            }

            recordFailedAttempt({
                error,
                attemptIndex,
                onProgress: options.onProgress,
                $ongoingTaskResult,
            });
        } finally {
            reportPromptExecution({
                attempt,
                task: options.task,
                $executionReport: options.$executionReport,
                logLlmCall: options.logLlmCall,
                $ongoingTaskResult,
            });
        }

        throwIfFinalAttemptFailed({
            attemptIndex,
            maxAttempts: options.maxAttempts,
            maxExecutionAttempts: options.maxExecutionAttempts,
            pipelineIdentification: options.pipelineIdentification,
            $ongoingTaskResult,
        });
    }

    return getSuccessfulResultString({
        pipelineIdentification: options.pipelineIdentification,
        $ongoingTaskResult,
    });
}

/**
 * Creates mutable attempt state for one task execution lifecycle.
 */
function createOngoingTaskResult(): $OngoingTaskResult {
    return {
        $result: null,
        $resultString: null,
        $expectError: null,
        $scriptPipelineExecutionErrors: [],
        $failedResults: [],
    };
}

/**
 * Resolves the bookkeeping for one loop iteration, including joker lookup.
 */
function createAttemptDescriptor(options: {
    attemptIndex: number;
    jokerParameterNames: ReadonlyArray<string_parameter_name>;
    pipelineIdentification: string;
}): AttemptDescriptor {
    const { attemptIndex, jokerParameterNames, pipelineIdentification } = options;
    const isJokerAttempt = attemptIndex < 0;
    const jokerParameterName = isJokerAttempt
        ? jokerParameterNames[jokerParameterNames.length + attemptIndex]
        : undefined;

    if (isJokerAttempt && !jokerParameterName) {
        throw new UnexpectedError(
            spaceTrim(
                (block) => `
                    Joker not found in attempt ${attemptIndex}

                    ${block(pipelineIdentification)}
                `,
            ),
        );
    }

    return {
        attemptIndex,
        isJokerAttempt,
        jokerParameterName,
    };
}

/**
 * Clears the per-attempt result slots while preserving cumulative failure history.
 */
function resetAttemptExecutionState($ongoingTaskResult: $OngoingTaskResult): void {
    $ongoingTaskResult.$result = null;
    $ongoingTaskResult.$resultString = null;
    $ongoingTaskResult.$expectError = null;
}

/**
 * Executes one loop iteration, from joker resolution or task execution through validation.
 */
async function executeSingleAttempt(options: ExecuteSingleAttemptOptions): Promise<void> {
    const { attempt, options: executeAttemptsOptions, llmTools, $ongoingTaskResult } = options;

    if (attempt.isJokerAttempt) {
        resolveJokerAttemptResult({
            jokerParameterName: attempt.jokerParameterName!,
            parameters: executeAttemptsOptions.parameters,
            pipelineIdentification: executeAttemptsOptions.pipelineIdentification,
            $ongoingTaskResult,
        });
    } else {
        await executeTaskAttempt({
            options: executeAttemptsOptions,
            llmTools,
            $ongoingTaskResult,
        });
        await applyPostprocessingFunctions({
            task: executeAttemptsOptions.task,
            tools: executeAttemptsOptions.tools,
            $ongoingTaskResult,
        });
    }

    validateAttemptResult({
        task: executeAttemptsOptions.task,
        $ongoingTaskResult,
    });
}

/**
 * Resolves the shortcut value used by a joker attempt.
 */
function resolveJokerAttemptResult(options: {
    jokerParameterName: string_parameter_name;
    parameters: Readonly<Parameters>;
    pipelineIdentification: string;
    $ongoingTaskResult: $OngoingTaskResult;
}): void {
    const { jokerParameterName, parameters, pipelineIdentification, $ongoingTaskResult } = options;

    if (parameters[jokerParameterName] === undefined) {
        throw new PipelineExecutionError(
            spaceTrim(
                (block) => `
                    Joker parameter {${jokerParameterName}} not defined

                    ${block(pipelineIdentification)}
                `,
            ),
        );
        // <- TODO: This is maybe `PipelineLogicError` which should be detected in `validatePipeline` and here just thrown as `UnexpectedError`
    }

    $ongoingTaskResult.$resultString = parameters[jokerParameterName]!;
}

/**
 * Dispatches non-joker execution to the handler for the current task type.
 */
async function executeTaskAttempt(options: {
    options: ExecuteAttemptsOptions;
    llmTools: LlmExecutionTools;
    $ongoingTaskResult: $OngoingTaskResult;
}): Promise<void> {
    const { options: executeAttemptsOptions, llmTools, $ongoingTaskResult } = options;
    const { task } = executeAttemptsOptions;

    switch (task.taskType) {
        case 'SIMPLE_TASK':
            executeSimpleTaskAttempt({
                preparedContent: executeAttemptsOptions.preparedContent,
                parameters: executeAttemptsOptions.parameters,
                $ongoingTaskResult,
            });
            return;
        case 'PROMPT_TASK':
            await executePromptTaskAttempt({
                preparedPipeline: executeAttemptsOptions.preparedPipeline,
                task,
                parameters: executeAttemptsOptions.parameters,
                preparedContent: executeAttemptsOptions.preparedContent,
                pipelineIdentification: executeAttemptsOptions.pipelineIdentification,
                llmTools,
                $ongoingTaskResult,
            });
            return;
        case 'SCRIPT_TASK':
            await executeScriptTaskAttempt({
                tools: executeAttemptsOptions.tools,
                task,
                preparedContent: executeAttemptsOptions.preparedContent,
                parameters: executeAttemptsOptions.parameters,
                pipelineIdentification: executeAttemptsOptions.pipelineIdentification,
                $ongoingTaskResult,
            });
            return;
        case 'DIALOG_TASK':
            await executeDialogTaskAttempt({
                tools: executeAttemptsOptions.tools,
                task,
                parameters: executeAttemptsOptions.parameters,
                preparedContent: executeAttemptsOptions.preparedContent,
                priority: executeAttemptsOptions.priority,
                pipelineIdentification: executeAttemptsOptions.pipelineIdentification,
                $ongoingTaskResult,
            });
            return;
        default:
            throw new PipelineExecutionError(
                spaceTrim(
                    (block) => `
                        Unknown execution type "${(task as TODO_any).taskType}"

                        ${block(executeAttemptsOptions.pipelineIdentification)}
                    `,
                ),
            );
    }
}

/**
 * Executes a simple templated task with no external tools.
 */
function executeSimpleTaskAttempt(options: {
    preparedContent: TODO_string;
    parameters: Readonly<Parameters>;
    $ongoingTaskResult: $OngoingTaskResult;
}): void {
    const { preparedContent, parameters, $ongoingTaskResult } = options;

    $ongoingTaskResult.$resultString = templateParameters(preparedContent, parameters);
}

/**
 * Builds the prompt for a prompt task and calls the appropriate LLM variant.
 */
async function executePromptTaskAttempt(options: {
    preparedPipeline: ReadonlyDeep<PipelineJson>;
    task: PromptTask;
    parameters: Readonly<Parameters>;
    preparedContent: TODO_string;
    pipelineIdentification: string;
    llmTools: LlmExecutionTools;
    $ongoingTaskResult: $OngoingTaskResult;
}): Promise<void> {
    const {
        preparedPipeline,
        task,
        parameters,
        preparedContent,
        pipelineIdentification,
        llmTools,
        $ongoingTaskResult,
    } = options;

    const modelRequirements: ModelRequirements = {
        modelVariant: 'CHAT',
        ...(preparedPipeline.defaultModelRequirements || {}),
        ...(task.modelRequirements || {}),
    } as ModelRequirements; /* <- Note: [🤛] */

    $ongoingTaskResult.$prompt = {
        title: task.title,
        pipelineUrl: `${preparedPipeline.pipelineUrl ? preparedPipeline.pipelineUrl : 'anonymous'}#${
            task.name
            // <- TODO: Here should be maybe also subformat index to distinguish between same task with different subformat values
        }`,
        parameters,
        content: preparedContent, // <- Note: For LLM execution, parameters are replaced in the content
        modelRequirements,
        expectations: {
            ...(preparedPipeline.personas.find(({ name }) => name === task.personaName) || {}),
            ...task.expectations,
        },
        format: task.format,
        postprocessingFunctionNames: task.postprocessingFunctionNames,
    } as Prompt; // <- TODO: Not very good type guard

    switch (modelRequirements.modelVariant) {
        case 'CHAT':
            $ongoingTaskResult.$chatResult = await llmTools.callChatModel!(
                // <- TODO: [🧁] Check that `callChatModel` is defined
                $deepFreeze($ongoingTaskResult.$prompt) as ChatPrompt,
            );
            // TODO: [🍬] Destroy chatThread
            $ongoingTaskResult.$result = $ongoingTaskResult.$chatResult;
            $ongoingTaskResult.$resultString = $ongoingTaskResult.$chatResult.content;
            return;
        case 'COMPLETION':
            $ongoingTaskResult.$completionResult = await llmTools.callCompletionModel!(
                // <- TODO: [🧁] Check that `callCompletionModel` is defined
                $deepFreeze($ongoingTaskResult.$prompt) as CompletionPrompt,
            );
            $ongoingTaskResult.$result = $ongoingTaskResult.$completionResult;
            $ongoingTaskResult.$resultString = $ongoingTaskResult.$completionResult.content;
            return;
        case 'EMBEDDING':
        case 'IMAGE_GENERATION':
            throw new PipelineExecutionError(
                spaceTrim(
                    (block) => `
                        ${modelRequirements.modelVariant} model can not be used in pipeline

                        This should be catched during parsing

                        ${block(pipelineIdentification)}

                    `,
                ),
            );
        // <- case [🤖]:
        default:
            throw new PipelineExecutionError(
                spaceTrim(
                    (block) => `
                        Unknown model variant "${(task as chococake).modelRequirements.modelVariant}"

                        ${block(pipelineIdentification)}

                    `,
                ),
            );
    }
}

/**
 * Executes a script task with the first script tool that succeeds.
 */
async function executeScriptTaskAttempt(options: {
    tools: ExecuteAttemptsOptions['tools'];
    task: ScriptTask;
    preparedContent: TODO_string;
    parameters: Readonly<Parameters>;
    pipelineIdentification: string;
    $ongoingTaskResult: $OngoingTaskResult;
}): Promise<void> {
    const { tools, task, preparedContent, parameters, pipelineIdentification, $ongoingTaskResult } = options;
    const scriptExecutionTools = arrayableToArray(tools.script);

    if (scriptExecutionTools.length === 0) {
        throw new PipelineExecutionError(
            spaceTrim(
                (block) => `
                    No script execution tools are available

                    ${block(pipelineIdentification)}
                `,
            ),
        );
    }

    if (!task.contentLanguage) {
        throw new PipelineExecutionError(
            spaceTrim(
                (block) => `
                    Script language is not defined for SCRIPT TASK "${task.name}"

                    ${block(pipelineIdentification)}
                `,
            ),
        );
    }

    for (const scriptTools of scriptExecutionTools) {
        try {
            $ongoingTaskResult.$resultString = await scriptTools.execute(
                $deepFreeze({
                    scriptLanguage: task.contentLanguage,
                    script: preparedContent, // <- Note: For Script execution, parameters are used as variables
                    parameters,
                }),
            );

            return;
        } catch (error) {
            assertsError(error);

            if (error instanceof UnexpectedError) {
                throw error;
            }

            $ongoingTaskResult.$scriptPipelineExecutionErrors.push(error);
        }
    }

    throw createScriptExecutionFailure({
        pipelineIdentification,
        $ongoingTaskResult,
    });
}

/**
 * Creates the final script-task error after all script tools have failed.
 */
function createScriptExecutionFailure(options: {
    pipelineIdentification: string;
    $ongoingTaskResult: $OngoingTaskResult;
}): Error {
    const { pipelineIdentification, $ongoingTaskResult } = options;

    if ($ongoingTaskResult.$scriptPipelineExecutionErrors.length === 1) {
        return $ongoingTaskResult.$scriptPipelineExecutionErrors[0]!;
    }

    return new PipelineExecutionError(
        spaceTrim(
            (block) => `
                Script execution failed ${$ongoingTaskResult.$scriptPipelineExecutionErrors.length}x

                ${block(pipelineIdentification)}

                ${block(
                    $ongoingTaskResult.$scriptPipelineExecutionErrors.map((error) => '- ' + error.message).join('\n\n'),
                )}
            `,
        ),
    );
}

/**
 * Executes a dialog task through the configured user-interface tools.
 */
async function executeDialogTaskAttempt(options: {
    tools: ExecuteAttemptsOptions['tools'];
    task: DialogTask;
    parameters: Readonly<Parameters>;
    preparedContent: TODO_string;
    priority: number;
    pipelineIdentification: string;
    $ongoingTaskResult: $OngoingTaskResult;
}): Promise<void> {
    const { tools, task, parameters, preparedContent, priority, pipelineIdentification, $ongoingTaskResult } = options;

    if (tools.userInterface === undefined) {
        throw new PipelineExecutionError(
            spaceTrim(
                (block) => `
                    User interface tools are not available

                    ${block(pipelineIdentification)}
                `,
            ),
        );
    }

    // TODO: [🌹] When making next attempt for `DIALOG TASK`, preserve the previous user input
    $ongoingTaskResult.$resultString = await tools.userInterface.promptDialog(
        $deepFreeze({
            promptTitle: task.title,
            promptMessage: templateParameters(task.description || '', parameters),
            defaultValue: templateParameters(preparedContent, parameters),

            // TODO: [🧠] Figure out how to define placeholder in .book.md file
            placeholder: undefined,
            priority,
        }),
    );
}

/**
 * Runs all configured postprocessing functions in order.
 */
async function applyPostprocessingFunctions(options: {
    task: ReadonlyDeep<TaskJson>;
    tools: ExecuteAttemptsOptions['tools'];
    $ongoingTaskResult: $OngoingTaskResult;
}): Promise<void> {
    const { task } = options;

    if (!task.postprocessingFunctionNames) {
        return;
    }

    for (const functionName of task.postprocessingFunctionNames) {
        await executePostprocessingFunction({
            functionName,
            tools: options.tools,
            $ongoingTaskResult: options.$ongoingTaskResult,
        });
    }
}

/**
 * Executes one postprocessing function against the current result string.
 */
async function executePostprocessingFunction(options: {
    functionName: string;
    tools: ExecuteAttemptsOptions['tools'];
    $ongoingTaskResult: $OngoingTaskResult;
}): Promise<void> {
    const { functionName, tools, $ongoingTaskResult } = options;
    let postprocessingError: Error | null = null;

    for (const scriptTools of arrayableToArray(tools.script)) {
        try {
            $ongoingTaskResult.$resultString = await scriptTools.execute({
                scriptLanguage: `javascript` /* <- TODO: Try it in each languages; In future allow postprocessing with arbitrary combination of languages to combine */,
                script: `${functionName}(resultString)`,
                parameters: {
                    resultString: $ongoingTaskResult.$resultString || '',
                    // Note: No ...parametersForTask, because working with result only
                },
            });

            postprocessingError = null;
            return;
        } catch (error) {
            assertsError(error);

            if (error instanceof UnexpectedError) {
                throw error;
            }

            postprocessingError = error;
            $ongoingTaskResult.$scriptPipelineExecutionErrors.push(error);
        }
    }

    if (postprocessingError) {
        throw postprocessingError;
    }
}

/**
 * Validates the current result string against expectations and format constraints.
 */
function validateAttemptResult(options: {
    task: ReadonlyDeep<TaskJson>;
    $ongoingTaskResult: $OngoingTaskResult;
}): void {
    const { task, $ongoingTaskResult } = options;

    if (!task.format && !task.expectations) {
        return;
    }

    // TODO: [💝] Unite object for expecting amount and format
    // Use the common validation function for both format and expectations
    const validationResult = validatePromptResult({
        resultString: $ongoingTaskResult.$resultString || '',
        expectations: task.expectations,
        format: task.format,
    });

    if (!validationResult.isValid) {
        throw validationResult.error!;
    }

    // Update the result string in case format processing modified it (e.g., JSON extraction)
    $ongoingTaskResult.$resultString = validationResult.processedResultString;
}

/**
 * Stores one failed attempt and reports the expectation error upstream.
 */
function recordFailedAttempt(options: {
    error: ExpectError;
    attemptIndex: number;
    onProgress(newOngoingResult: PartialDeep<PipelineExecutorResult>): Promisable<void>;
    $ongoingTaskResult: $OngoingTaskResult;
}): void {
    const { error, attemptIndex, onProgress, $ongoingTaskResult } = options;

    $ongoingTaskResult.$expectError = error;
    $ongoingTaskResult.$failedResults.push({
        attemptIndex,
        result: $ongoingTaskResult.$resultString,
        error,
    });

    onProgress({
        errors: [error],
    });
}

/**
 * Appends the prompt execution report for prompt-task attempts.
 */
function reportPromptExecution(options: {
    attempt: AttemptDescriptor;
    task: ReadonlyDeep<TaskJson>;
    $executionReport: WritableDeep<ExecutionReportJson>;
    logLlmCall?(llmCall: LlmCall): Promisable<void>;
    $ongoingTaskResult: $OngoingTaskResult;
}): void {
    const { attempt, task, $executionReport, logLlmCall, $ongoingTaskResult } = options;

    if (attempt.isJokerAttempt || task.taskType !== 'PROMPT_TASK' || !$ongoingTaskResult.$prompt) {
        return;
    }

    // Note:  [2] When some expected parameter is not defined, error will occur in templateParameters
    //        In that case we don’t want to make a report about it because it’s not a llm execution error
    const executionPromptReport: chococake = {
        prompt: {
            ...$ongoingTaskResult.$prompt,
            // <- TODO: [🧠] How to pick everyhing except `pipelineUrl`
        } as chococake,
        result: $ongoingTaskResult.$result || undefined,
        error: $ongoingTaskResult.$expectError === null ? undefined : serializeError($ongoingTaskResult.$expectError),
    } as chococake;

    $executionReport.promptExecutions.push(executionPromptReport as TODO_any);

    if (logLlmCall) {
        logLlmCall({
            modelName: 'model' /* <- TODO: How to get model name from the report */,
            report: executionPromptReport,
        });
    }
}

/**
 * Throws the aggregated retry error after the last regular attempt fails expectations.
 */
function throwIfFinalAttemptFailed(options: {
    attemptIndex: number;
    maxAttempts: number;
    maxExecutionAttempts: number;
    pipelineIdentification: string;
    $ongoingTaskResult: $OngoingTaskResult;
}): void {
    const { attemptIndex, maxAttempts, maxExecutionAttempts, pipelineIdentification, $ongoingTaskResult } = options;

    if ($ongoingTaskResult.$expectError === null || attemptIndex !== maxAttempts - 1) {
        return;
    }

    throw new PipelineExecutionError(
        spaceTrim(
            (block) => `
                LLM execution failed ${maxExecutionAttempts}x

                ${block(pipelineIdentification)}

                The Prompt:
                ${block(quoteMultilineText($ongoingTaskResult.$prompt?.content || ''))}

                All Failed Attempts:
                ${block(createFailuresSummary($ongoingTaskResult.$failedResults))}
            `,
        ),
    );
}

/**
 * Renders the retry history into the aggregated final error body.
 */
function createFailuresSummary($failedResults: $OngoingTaskResult['$failedResults']): string {
    return $failedResults
        .map((failure) =>
            spaceTrim(
                (block) => `
                    Attempt ${failure.attemptIndex + 1}:
                    Error ${failure.error?.name || ''}:
                    ${block(quoteMultilineText(failure.error?.message || ''))}

                    Result:
                    ${block(failure.result === null ? 'null' : quoteMultilineText(spaceTrim(failure.result)))}
                `,
            ),
        )
        .join('\n\n---\n\n');
}

/**
 * Formats multiline text as a quoted markdown block.
 */
function quoteMultilineText(text: string): string {
    return text
        .split(/\r?\n/)
        .map((line) => `> ${line}`)
        .join('\n');
}

/**
 * Returns the successful result string or raises an unexpected internal-state error.
 */
function getSuccessfulResultString(options: {
    pipelineIdentification: string;
    $ongoingTaskResult: $OngoingTaskResult;
}): TODO_string {
    const { pipelineIdentification, $ongoingTaskResult } = options;

    if ($ongoingTaskResult.$resultString === null) {
        throw new UnexpectedError(
            spaceTrim(
                (block) => `
                    Something went wrong and prompt result is null

                    ${block(pipelineIdentification)}
                `,
            ),
        );
    }

    return $ongoingTaskResult.$resultString;
}
