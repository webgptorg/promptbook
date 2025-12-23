import { spaceTrim } from 'spacetrim';
import type { PartialDeep, Promisable, ReadonlyDeep, WritableDeep } from 'type-fest';
import { assertsError } from '../../errors/assertsError';
import { ExpectError } from '../../errors/ExpectError';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import { UnexpectedError } from '../../errors/UnexpectedError';
import { serializeError } from '../../errors/utils/serializeError';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import { getSingleLlmExecutionTools } from '../../llm-providers/_multiple/getSingleLlmExecutionTools';
import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';
import type { TaskJson } from '../../pipeline/PipelineJson/TaskJson';
import type { LlmCall } from '../../types/LlmCall';
import type { ModelRequirements } from '../../types/ModelRequirements';
import type { ChatPrompt, CompletionPrompt, Prompt } from '../../types/Prompt';
import type { Parameters, string_parameter_name } from '../../types/typeAliases';
import { arrayableToArray } from '../../utils/misc/arrayableToArray';
import { keepTypeImported } from '../../utils/organization/keepTypeImported';
import type { chococake } from '../../utils/organization/really_any';
import type { TODO_any } from '../../utils/organization/TODO_any';
import type { TODO_string } from '../../utils/organization/TODO_string';
import { templateParameters } from '../../utils/parameters/templateParameters';
import { $deepFreeze } from '../../utils/serialization/$deepFreeze';
import type { ExecutionReportJson } from '../execution-report/ExecutionReportJson';
import type { PipelineExecutorResult } from '../PipelineExecutorResult';
import { validatePromptResult } from '../utils/validatePromptResult';
import type { ValidatePromptResultResult } from '../utils/validatePromptResult';
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
 * Track all failed attempts during execution
 */
const allFailedResults: Array<{ result: string | null; error: ExpectError }> = [];

/**
 * Executes a pipeline task with multiple attempts, including joker and retry logic. Handles different task types
 * (prompt, script, dialog, etc.), applies postprocessing, checks expectations, and updates the execution report.
 * Throws errors if execution fails after all attempts.
 *
 * @param options - The options for execution, including task, parameters, pipeline, and configuration.
 * @returns The result string of the executed task.
 * @private internal utility of `createPipelineExecutor`
 */
export async function executeAttempts(options: ExecuteAttemptsOptions): Promise<TODO_string> {
    const {
        jokerParameterNames,
        priority,
        maxAttempts, // <- Note: [💂]
        preparedContent,
        parameters,
        task,
        preparedPipeline,
        tools,
        $executionReport,
        pipelineIdentification,
        maxExecutionAttempts,
        onProgress,
        logLlmCall,
    } = options;

    const $ongoingTaskResult: $OngoingTaskResult = {
        $result: null,
        $resultString: null,
        $expectError: null,
        $scriptPipelineExecutionErrors: [],
        $failedResults: [], // Track all failed attempts
    };

    const llmTools: LlmExecutionTools = getSingleLlmExecutionTools(tools.llm);

    attempts: for (let attemptIndex: number = -jokerParameterNames.length; attemptIndex < maxAttempts; attemptIndex++) {
        const isJokerAttempt: boolean = attemptIndex < 0;
        const jokerParameterName: undefined | string_parameter_name =
            jokerParameterNames[jokerParameterNames.length + attemptIndex];

        // TODO: [🧠][🍭] JOKERS, EXPECTATIONS, POSTPROCESSING and FOREACH
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

        $ongoingTaskResult.$result = null;
        $ongoingTaskResult.$resultString = null;
        $ongoingTaskResult.$expectError = null;

        if (isJokerAttempt) {
            if (parameters[jokerParameterName!] === undefined) {
                throw new PipelineExecutionError(
                    spaceTrim(
                        (block) => `
                            Joker parameter {${jokerParameterName}} not defined

                            ${block(pipelineIdentification)}
                        `,
                    ),
                );
                // <- TODO: This is maybe `PipelineLogicError` which should be detected in `validatePipeline` and here just thrown as `UnexpectedError`
            } else {
                $ongoingTaskResult.$resultString = parameters[jokerParameterName!]!;
            }
        }

        try {
            if (!isJokerAttempt) {
                taskType: switch (task.taskType) {
                    case 'SIMPLE_TASK':
                        $ongoingTaskResult.$resultString = templateParameters(preparedContent, parameters);
                        break taskType;

                    case 'PROMPT_TASK':
                        {
                            const modelRequirements: ModelRequirements = {
                                modelVariant: 'CHAT',
                                ...(preparedPipeline.defaultModelRequirements || {}),
                                ...(task.modelRequirements || {}),
                            } as ModelRequirements; /* <- Note: [🤛] */

                            $ongoingTaskResult.$prompt = {
                                title: task.title,
                                pipelineUrl: `${
                                    preparedPipeline.pipelineUrl
                                        ? preparedPipeline.pipelineUrl
                                        : 'anonymous' /* <- TODO: [🧠] How to deal with anonymous pipelines, do here some auto-url like SHA-256 based ad-hoc identifier? */
                                }#${
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

                            variant: switch (modelRequirements.modelVariant) {
                                case 'CHAT':
                                    $ongoingTaskResult.$chatResult = await llmTools.callChatModel!(
                                        // <- TODO: [🧁] Check that `callChatModel` is defined
                                        $deepFreeze($ongoingTaskResult.$prompt) as ChatPrompt,
                                    );
                                    // TODO: [🍬] Destroy chatThread
                                    $ongoingTaskResult.$result = $ongoingTaskResult.$chatResult;
                                    $ongoingTaskResult.$resultString = $ongoingTaskResult.$chatResult.content;
                                    break variant;
                                case 'COMPLETION':
                                    $ongoingTaskResult.$completionResult = await llmTools.callCompletionModel!(
                                        // <- TODO: [🧁] Check that `callCompletionModel` is defined
                                        $deepFreeze($ongoingTaskResult.$prompt) as CompletionPrompt,
                                    );
                                    $ongoingTaskResult.$result = $ongoingTaskResult.$completionResult;
                                    $ongoingTaskResult.$resultString = $ongoingTaskResult.$completionResult.content;
                                    break variant;

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
                                    break variant;

                                // <- case [🤖]:

                                default:
                                    throw new PipelineExecutionError(
                                        spaceTrim(
                                            (block) => `
                                                Unknown model variant "${
                                                    (task as chococake).modelRequirements.modelVariant
                                                }"

                                                ${block(pipelineIdentification)}

                                            `,
                                        ),
                                    );
                            }
                        }
                        break;

                    case 'SCRIPT_TASK':
                        if (arrayableToArray(tools.script).length === 0) {
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

                        // TODO: DRY [☯]
                        scripts: for (const scriptTools of arrayableToArray(tools.script)) {
                            try {
                                $ongoingTaskResult.$resultString = await scriptTools.execute(
                                    $deepFreeze({
                                        scriptLanguage: task.contentLanguage,
                                        script: preparedContent, // <- Note: For Script execution, parameters are used as variables
                                        parameters,
                                    }),
                                );

                                break scripts;
                            } catch (error) {
                                assertsError(error);

                                if (error instanceof UnexpectedError) {
                                    throw error;
                                }

                                $ongoingTaskResult.$scriptPipelineExecutionErrors.push(error);
                            }
                        }

                        if ($ongoingTaskResult.$resultString !== null) {
                            break taskType;
                        }

                        if ($ongoingTaskResult.$scriptPipelineExecutionErrors.length === 1) {
                            throw $ongoingTaskResult.$scriptPipelineExecutionErrors[0];
                        } else {
                            throw new PipelineExecutionError(
                                spaceTrim(
                                    (block) => `
                                        Script execution failed ${
                                            $ongoingTaskResult.$scriptPipelineExecutionErrors.length
                                        }x

                                        ${block(pipelineIdentification)}

                                        ${block(
                                            $ongoingTaskResult.$scriptPipelineExecutionErrors
                                                .map((error) => '- ' + error.message)
                                                .join('\n\n'),
                                        )}
                                    `,
                                ),
                            );
                        }

                        // Note: This line is unreachable because of the break taskType above
                        break taskType;

                    case 'DIALOG_TASK':
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
                        break taskType;

                    // <- case: [🅱]

                    default:
                        throw new PipelineExecutionError(
                            spaceTrim(
                                (block) => `
                                    Unknown execution type "${(task as TODO_any).taskType}"

                                    ${block(pipelineIdentification)}
                                `,
                            ),
                        );
                }
            }

            if (!isJokerAttempt && task.postprocessingFunctionNames) {
                for (const functionName of task.postprocessingFunctionNames) {
                    let postprocessingError = null;

                    scripts: for (const scriptTools of arrayableToArray(tools.script)) {
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
                            break scripts;
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
            }

            // TODO: [💝] Unite object for expecting amount and format
            // Use the common validation function for both format and expectations
            if (task.format || task.expectations) {
                const validationResult: ValidatePromptResultResult = validatePromptResult({
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

            break attempts;
        } catch (error) {
            if (!(error instanceof ExpectError)) {
                throw error;
            }

            $ongoingTaskResult.$expectError = error;
            // Store failed attempt
            allFailedResults.push({
                result: $ongoingTaskResult.$resultString,
                error: error as ExpectError,
            });
            // Store each failed attempt
            if (!Array.isArray($ongoingTaskResult.$failedResults)) {
                $ongoingTaskResult.$failedResults = [];
            }
            $ongoingTaskResult.$failedResults.push({
                attemptIndex,
                result: $ongoingTaskResult.$resultString,
                error: error,
            });

            // Report failed attempt
            onProgress({
                errors: [error],
            });
        } finally {
            if (!isJokerAttempt && task.taskType === 'PROMPT_TASK' && $ongoingTaskResult.$prompt!) {
                // Note:  [2] When some expected parameter is not defined, error will occur in templateParameters
                //        In that case we don’t want to make a report about it because it’s not a llm execution error

                const executionPromptReport: chococake = {
                    prompt: {
                        ...$ongoingTaskResult.$prompt,
                        // <- TODO: [🧠] How to pick everyhing except `pipelineUrl`
                    } as chococake,
                    result: $ongoingTaskResult.$result || undefined,
                    error:
                        $ongoingTaskResult.$expectError === null
                            ? undefined
                            : serializeError($ongoingTaskResult.$expectError),
                } as chococake;

                $executionReport.promptExecutions.push(executionPromptReport as TODO_any);

                if (logLlmCall) {
                    logLlmCall({
                        modelName: 'model' /* <- TODO: How to get model name from the report */,
                        report: executionPromptReport,
                    });
                }
            }
        }
        if ($ongoingTaskResult.$expectError !== null && attemptIndex === maxAttempts - 1) {
            // Note: Create a summary of all failures
            const failuresSummary: string = $ongoingTaskResult.$failedResults
                .map((failure) =>
                    spaceTrim(
                        (block) => `
                            Attempt ${failure.attemptIndex + 1}:
                            Error ${failure.error?.name || ''}:
                            ${block(
                                failure.error?.message
                                    .split('\n')
                                    .map((line) => `> ${line}`)
                                    .join('\n'),
                            )}

                            Result:
                            ${block(
                                failure.result === null
                                    ? 'null'
                                    : spaceTrim(failure.result)
                                          .split('\n')
                                          .map((line) => `> ${line}`)
                                          .join('\n'),
                            )}
                        `,
                    ),
                )
                .join('\n\n---\n\n');

            throw new PipelineExecutionError(
                spaceTrim(
                    (block) => `
                        LLM execution failed ${maxExecutionAttempts}x

                        ${block(pipelineIdentification)}

                        The Prompt:
                        ${block(
                            ($ongoingTaskResult.$prompt?.content || '')
                                .split('\n')
                                .map((line) => `> ${line}`)
                                .join('\n'),
                        )}

                        All Failed Attempts:
                        ${block(failuresSummary)}
                    `,
                ),
            );
        }
    }

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

/**
 * TODO: Break into smaller functions
 */
