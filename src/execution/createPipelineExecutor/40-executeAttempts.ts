import { spaceTrim } from 'spacetrim';
import type { ReadonlyDeep, WritableDeep } from 'type-fest';
import { assertsError } from '../../errors/assertsError';
import { ExpectError } from '../../errors/ExpectError';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import { UnexpectedError } from '../../errors/UnexpectedError';
import { serializeError } from '../../errors/utils/serializeError';
import { isValidJsonString } from '../../formats/json/utils/isValidJsonString';
import { joinLlmExecutionTools } from '../../llm-providers/multiple/joinLlmExecutionTools';
import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';
import type { TaskJson } from '../../pipeline/PipelineJson/TaskJson';
import { extractJsonBlock } from '../../postprocessing/utils/extractJsonBlock';
import type { ModelRequirements } from '../../types/ModelRequirements';
import type { ChatPrompt } from '../../types/Prompt';
import type { CompletionPrompt } from '../../types/Prompt';
import type { Prompt } from '../../types/Prompt';
import type { Parameters } from '../../types/typeAliases';
import type { string_parameter_name } from '../../types/typeAliases';
import { arrayableToArray } from '../../utils/arrayableToArray';
import { keepTypeImported } from '../../utils/organization/keepTypeImported';
import { keepUnused } from '../../utils/organization/keepUnused';
import type { really_any } from '../../utils/organization/really_any';
import type { TODO_any } from '../../utils/organization/TODO_any';
import type { TODO_string } from '../../utils/organization/TODO_string';
import { templateParameters } from '../../utils/parameters/templateParameters';
import { $deepFreeze } from '../../utils/serialization/$deepFreeze';
import type { ExecutionReportJson } from '../execution-report/ExecutionReportJson';
import { checkExpectations } from '../utils/checkExpectations';
import type { $OngoingTaskResult } from './$OngoingTaskResult';
import type { CreatePipelineExecutorOptions } from './00-CreatePipelineExecutorOptions';

keepTypeImported<ModelRequirements>();

/**
 * @@@
 *
 * @private internal type of `executeAttempts`
 */
export type ExecuteAttemptsOptions = Required<Omit<CreatePipelineExecutorOptions, 'pipeline'>> & {
    /**
     * @@@
     */
    readonly jokerParameterNames: Readonly<ReadonlyArray<string_parameter_name>>;

    /**
     * @@@
     */
    readonly priority: number;

    /**
     * @@@
     *
     * Note: [💂] There are two distinct variabiles
     * 1) `maxExecutionAttempts` - the amount of attempts LLM model
     * 2) `maxAttempts` - the amount of attempts for any task - LLM, SCRIPT, DIALOG, etc.
     */
    readonly maxAttempts: number;

    /**
     * @@@
     */
    readonly preparedContent: TODO_string;

    /**
     * @@@
     */
    readonly parameters: Readonly<Parameters>;

    /**
     * @@@
     */
    readonly task: ReadonlyDeep<TaskJson>;

    /**
     * @@@
     */
    readonly preparedPipeline: ReadonlyDeep<PipelineJson>;

    /**
     * @@@
     */
    readonly $executionReport: WritableDeep<ExecutionReportJson>;

    /**
     * @@@
     */
    readonly pipelineIdentification: string;
};

/**
 * @@@
 *
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
    } = options;

    const $ongoingTaskResult: $OngoingTaskResult = {
        $result: null,
        $resultString: null,
        $expectError: null,
        $scriptPipelineExecutionErrors: [],
    };

    // TODO: [🚐] Make arrayable LLMs -> single LLM DRY
    const _llms = arrayableToArray(tools.llm);
    const llmTools = _llms.length === 1 ? _llms[0]! : joinLlmExecutionTools(..._llms);

    attempts: for (let attempt = -jokerParameterNames.length; attempt < maxAttempts; attempt++) {
        const isJokerAttempt = attempt < 0;
        const jokerParameterName = jokerParameterNames[jokerParameterNames.length + attempt];

        // TODO: [🧠][🍭] JOKERS, EXPECTATIONS, POSTPROCESSING and FOREACH
        if (isJokerAttempt && !jokerParameterName) {
            throw new UnexpectedError(
                spaceTrim(
                    (block) => `
                        Joker not found in attempt ${attempt}

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
                            const modelRequirements = {
                                modelVariant: 'CHAT',
                                ...(preparedPipeline.defaultModelRequirements || {}),
                                ...(task.modelRequirements || {}),
                            } satisfies ModelRequirements; /* <- Note: [🤛] */

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
                                    throw new PipelineExecutionError(
                                        spaceTrim(
                                            (block) => `
                                                Embedding model can not be used in pipeline

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
                                                    (task as really_any).modelRequirements.modelVariant
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
            if (task.format) {
                if (task.format === 'JSON') {
                    if (!isValidJsonString($ongoingTaskResult.$resultString || '')) {
                        // TODO: [🏢] Do more universally via `FormatDefinition`

                        try {
                            $ongoingTaskResult.$resultString = extractJsonBlock($ongoingTaskResult.$resultString || '');
                        } catch (error) {
                            keepUnused(
                                error,
                                // <- Note: This error is not important
                                //          ONLY imporant thing is the information that `resultString` not contain valid JSON block
                            );

                            throw new ExpectError(
                                spaceTrim(
                                    (block) => `
                                        Expected valid JSON string

                                        ${block(
                                            /*<- Note: No need for `pipelineIdentification`, it will be catched and added later */ '',
                                        )}
                                    `,
                                ),
                            );
                        }
                    }
                } else {
                    throw new UnexpectedError(
                        spaceTrim(
                            (block) => `
                                Unknown format "${task.format}"

                                ${block(pipelineIdentification)}
                            `,
                        ),
                    );
                }
            }

            // TODO: [💝] Unite object for expecting amount and format
            if (task.expectations) {
                checkExpectations(task.expectations, $ongoingTaskResult.$resultString || '');
            }

            break attempts;
        } catch (error) {
            if (!(error instanceof ExpectError)) {
                throw error;
            }

            $ongoingTaskResult.$expectError = error;
        } finally {
            if (
                !isJokerAttempt &&
                task.taskType === 'PROMPT_TASK' &&
                $ongoingTaskResult.$prompt!
                //    <- Note:  [2] When some expected parameter is not defined, error will occur in templateParameters
                //              In that case we don’t want to make a report about it because it’s not a llm execution error
            ) {
                // TODO: [🧠] Maybe put other taskTypes into report
                $executionReport.promptExecutions.push({
                    prompt: {
                        ...$ongoingTaskResult.$prompt,
                        // <- TODO: [🧠] How to pick everyhing except `pipelineUrl`
                    } as really_any,
                    result: $ongoingTaskResult.$result || undefined,
                    error:
                        $ongoingTaskResult.$expectError === null
                            ? undefined
                            : serializeError($ongoingTaskResult.$expectError),
                });
            }
        }

        if ($ongoingTaskResult.$expectError !== null && attempt === maxAttempts - 1) {
            throw new PipelineExecutionError(
                spaceTrim(
                    (block) => `
                        LLM execution failed ${maxExecutionAttempts}x

                        ${block(pipelineIdentification)}

                        ---
                        The Prompt:
                        ${block(
                            ($ongoingTaskResult.$prompt?.content || '')
                                .split('\n')
                                .map((line) => `> ${line}`)
                                .join('\n'),
                        )}

                        Last error ${$ongoingTaskResult.$expectError?.name || ''}:
                        ${block(
                            ($ongoingTaskResult.$expectError?.message || '')
                                .split('\n')
                                .map((line) => `> ${line}`)
                                .join('\n'),
                        )}

                        Last result:
                        ${block(
                            $ongoingTaskResult.$resultString === null
                                ? 'null'
                                : spaceTrim($ongoingTaskResult.$resultString)
                                      .split('\n')
                                      .map((line) => `> ${line}`)
                                      .join('\n'),
                        )}
                        ---
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
