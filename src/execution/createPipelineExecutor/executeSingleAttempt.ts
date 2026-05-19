import { spaceTrim } from 'spacetrim';
import type { ReadonlyDeep } from 'type-fest';
import { assertsError } from '../../errors/assertsError';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import { UnexpectedError } from '../../errors/UnexpectedError';
import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';
import type { TaskJson } from '../../pipeline/PipelineJson/TaskJson';
import type { ModelRequirements } from '../../types/ModelRequirements';
import type { Parameters } from '../../types/Parameters';
import type { ChatPrompt, CompletionPrompt, Prompt } from '../../types/Prompt';
import type { string_parameter_name } from '../../types/string_name';
import { arrayableToArray } from '../../utils/misc/arrayableToArray';
import type { chococake } from '../../utils/organization/really_any';
import type { TODO_any } from '../../utils/organization/TODO_any';
import type { TODO_string } from '../../utils/organization/TODO_string';
import { templateParameters } from '../../utils/parameters/templateParameters';
import { $deepFreeze } from '../../utils/serialization/$deepFreeze';
import type { LlmExecutionTools } from '../LlmExecutionTools';
import { validatePromptResult } from '../utils/validatePromptResult';
import type { $OngoingTaskResult } from './$OngoingTaskResult';
import type { ExecuteAttemptsOptions } from './40-executeAttempts';

/**
 * Readonly prompt-task shape used by prompt-specific helpers.
 *
 * @private function of `executeSingleAttempt`
 */
type PromptTask = ReadonlyDeep<Extract<TaskJson, { taskType: 'PROMPT_TASK' }>>;

/**
 * Readonly script-task shape used by script-specific helpers.
 *
 * @private function of `executeSingleAttempt`
 */
type ScriptTask = ReadonlyDeep<Extract<TaskJson, { taskType: 'SCRIPT_TASK' }>>;

/**
 * Readonly dialog-task shape used by dialog-specific helpers.
 *
 * @private function of `executeSingleAttempt`
 */
type DialogTask = ReadonlyDeep<Extract<TaskJson, { taskType: 'DIALOG_TASK' }>>;

/**
 * Executes one loop iteration, from joker resolution or task execution through validation.
 *
 * @private function of `executeAttempts`
 */
export async function executeSingleAttempt(options: {
    /**
     * Metadata describing the current loop iteration.
     */
    readonly attempt: {
        readonly attemptIndex: number;
        readonly isJokerAttempt: boolean;
        readonly jokerParameterName?: string_parameter_name;
    };

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
}): Promise<void> {
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
