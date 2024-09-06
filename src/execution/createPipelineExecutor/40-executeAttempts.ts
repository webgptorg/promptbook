import { spaceTrim } from 'spacetrim';
import type { ReadonlyDeep } from 'type-fest';
import { ExpectError } from '../../errors/ExpectError';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import { UnexpectedError } from '../../errors/UnexpectedError';
import { serializeError } from '../../errors/utils/serializeError';
import { isValidJsonString } from '../../formats/json/utils/isValidJsonString';
import { MultipleLlmExecutionTools } from '../../llm-providers/multiple/MultipleLlmExecutionTools';
import { extractJsonBlock } from '../../postprocessing/utils/extractJsonBlock';
import type { ExecutionReportJson } from '../../types/execution-report/ExecutionReportJson';
import type { ModelRequirements } from '../../types/ModelRequirements';
import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';
import type { TemplateJson } from '../../types/PipelineJson/TemplateJson';
import type { ChatPrompt, CompletionPrompt, EmbeddingPrompt, Prompt } from '../../types/Prompt';
import type { Parameters, string_parameter_name } from '../../types/typeAliases';
import { arrayableToArray } from '../../utils/arrayableToArray';
import { keepUnused } from '../../utils/organization/keepUnused';
import type { really_any } from '../../utils/organization/really_any';
import type { TODO_any } from '../../utils/organization/TODO_any';
import type { TODO_string } from '../../utils/organization/TODO_string';
import { replaceParameters } from '../../utils/replaceParameters';
import { $deepFreeze } from '../../utils/serialization/$deepFreeze';
import type { ExecutionTools } from '../ExecutionTools';
import { checkExpectations } from '../utils/checkExpectations';
import type { $OngoingTemplateResult } from './$OngoingTemplateResult';
import type { CreatePipelineExecutorSettings } from './00-CreatePipelineExecutorSettings';

/**
 * @@@
 *
 * @private internal type of `executeAttempts`
 */
export type ExecuteAttemptsOptions = {
    /**
     * @@@
     */
    readonly jokerParameterNames: Readonly<Array<string_parameter_name>>;

    /**
     * @@@
     */
    readonly priority: number;

    /**
     * @@@
     */
    readonly maxAttempts: number; // <- [🤹‍♂️] In `ExecuteAttemptsOptions` should be just `setting` or `maxAttempts`

    /**
     * @@@
     */
    readonly preparedContent: TODO_string;

    /**
     * @@@
     */
    readonly parameters: ReadonlyDeep<Parameters>;

    /**
     * @@@
     */
    readonly template: ReadonlyDeep<TemplateJson>;

    /**
     * @@@
     */
    readonly preparedPipeline: ReadonlyDeep<PipelineJson>;

    /**
     * @@@
     */
    readonly tools: Omit<ExecutionTools, 'llm'>;

    /**
     * @@@
     */
    readonly llmTools: MultipleLlmExecutionTools;

    /**
     * Settings for the pipeline executor
     */
    readonly settings: CreatePipelineExecutorSettings; // <- [🤹‍♂️] In `ExecuteAttemptsOptions` should be just `setting` or `maxAttempts`

    /**
     * @@@
     */
    readonly $executionReport: ExecutionReportJson;

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
        maxAttempts,
        preparedContent,
        parameters,
        template,
        preparedPipeline,
        tools,
        llmTools,
        settings,
        $executionReport,
        pipelineIdentification,
    } = options;
    const { maxExecutionAttempts } = settings;

    const $ongoingTemplateResult: $OngoingTemplateResult = {
        $result: null,
        $resultString: null,
        $expectError: null,
        $scriptPipelineExecutionErrors: [],
    };

    attempts: for (let attempt = -jokerParameterNames.length; attempt < maxAttempts; attempt++) {
        const isJokerAttempt = attempt < 0;
        const jokerParameterName = jokerParameterNames[jokerParameterNames.length + attempt];

        // TODO: [🧠] !!!!!! JOKERS, EXPECTATIONS, POSTPROCESSING and FOREACH
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

        $ongoingTemplateResult.$result = null;
        $ongoingTemplateResult.$resultString = null;
        $ongoingTemplateResult.$expectError = null;

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
                $ongoingTemplateResult.$resultString = parameters[jokerParameterName!]!;
            }
        }

        try {
            if (!isJokerAttempt) {
                templateType: switch (template.templateType) {
                    case 'SIMPLE_TEMPLATE':
                        $ongoingTemplateResult.$resultString = replaceParameters(preparedContent, parameters);
                        break templateType;

                    case 'PROMPT_TEMPLATE':
                        {
                            const modelRequirements = {
                                modelVariant: 'CHAT',
                                ...(preparedPipeline.defaultModelRequirements || {}),
                                ...(template.modelRequirements || {}),
                            } satisfies ModelRequirements;

                            $ongoingTemplateResult.$prompt = {
                                title: template.title,
                                pipelineUrl: `${
                                    preparedPipeline.pipelineUrl
                                        ? preparedPipeline.pipelineUrl
                                        : 'anonymous' /* <- TODO: [🧠] How to deal with anonymous pipelines, do here some auto-url like SHA-256 based ad-hoc identifier? */
                                }#${template.name}`,
                                parameters,
                                content: preparedContent, // <- Note: For LLM execution, parameters are replaced in the content
                                modelRequirements,
                                expectations: {
                                    ...(preparedPipeline.personas.find(({ name }) => name === template.personaName) ||
                                        {}),
                                    ...template.expectations,
                                },
                                format: template.format,
                                postprocessingFunctionNames: template.postprocessingFunctionNames,
                            } as Prompt; // <- TODO: Not very good type guard

                            variant: switch (modelRequirements.modelVariant) {
                                case 'CHAT':
                                    $ongoingTemplateResult.$chatResult = await llmTools.callChatModel(
                                        $deepFreeze($ongoingTemplateResult.$prompt) as ChatPrompt,
                                    );
                                    // TODO: [🍬] Destroy chatThread
                                    $ongoingTemplateResult.$result = $ongoingTemplateResult.$chatResult;
                                    $ongoingTemplateResult.$resultString = $ongoingTemplateResult.$chatResult.content;
                                    break variant;
                                case 'COMPLETION':
                                    $ongoingTemplateResult.$completionResult = await llmTools.callCompletionModel(
                                        $deepFreeze($ongoingTemplateResult.$prompt) as CompletionPrompt,
                                    );
                                    $ongoingTemplateResult.$result = $ongoingTemplateResult.$completionResult;
                                    $ongoingTemplateResult.$resultString =
                                        $ongoingTemplateResult.$completionResult.content;
                                    break variant;

                                case 'EMBEDDING':
                                    // TODO: [🧠] This is weird, embedding model can not be used such a way in the pipeline
                                    $ongoingTemplateResult.$embeddingResult = await llmTools.callEmbeddingModel(
                                        $deepFreeze($ongoingTemplateResult.$prompt) as EmbeddingPrompt,
                                    );
                                    $ongoingTemplateResult.$result = $ongoingTemplateResult.$embeddingResult;
                                    $ongoingTemplateResult.$resultString =
                                        $ongoingTemplateResult.$embeddingResult.content.join(',');
                                    break variant;

                                // <- case [🤖]:

                                default:
                                    throw new PipelineExecutionError(
                                        spaceTrim(
                                            (block) => `
                                              Unknown model variant "${
                                                  (template as really_any).modelRequirements.modelVariant
                                              }"

                                              ${block(pipelineIdentification)}

                                          `,
                                        ),
                                    );
                            }
                        }
                        break;

                    case 'SCRIPT_TEMPLATE':
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
                        if (!template.contentLanguage) {
                            throw new PipelineExecutionError(
                                spaceTrim(
                                    (block) => `
                                      Script language is not defined for SCRIPT TEMPLATE "${template.name}"

                                      ${block(pipelineIdentification)}
                                  `,
                                ),
                            );
                        }

                        // TODO: DRY [☯]
                        scripts: for (const scriptTools of arrayableToArray(tools.script)) {
                            try {
                                $ongoingTemplateResult.$resultString = await scriptTools.execute(
                                    $deepFreeze({
                                        scriptLanguage: template.contentLanguage,
                                        script: preparedContent, // <- Note: For Script execution, parameters are used as variables
                                        parameters,
                                    }),
                                );

                                break scripts;
                            } catch (error) {
                                if (!(error instanceof Error)) {
                                    throw error;
                                }

                                if (error instanceof UnexpectedError) {
                                    throw error;
                                }

                                $ongoingTemplateResult.$scriptPipelineExecutionErrors.push(error);
                            }
                        }

                        if ($ongoingTemplateResult.$resultString !== null) {
                            break templateType;
                        }

                        if ($ongoingTemplateResult.$scriptPipelineExecutionErrors.length === 1) {
                            throw $ongoingTemplateResult.$scriptPipelineExecutionErrors[0];
                        } else {
                            throw new PipelineExecutionError(
                                spaceTrim(
                                    (block) => `
                                      Script execution failed ${
                                          $ongoingTemplateResult.$scriptPipelineExecutionErrors.length
                                      }x

                                      ${block(pipelineIdentification)}

                                      ${block(
                                          $ongoingTemplateResult.$scriptPipelineExecutionErrors
                                              .map((error) => '- ' + error.message)
                                              .join('\n\n'),
                                      )}
                                  `,
                                ),
                            );
                        }

                        // Note: This line is unreachable because of the break templateType above
                        break templateType;

                    case 'DIALOG_TEMPLATE':
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

                        // TODO: [🌹] When making next attempt for `DIALOG TEMPLATE`, preserve the previous user input
                        $ongoingTemplateResult.$resultString = await tools.userInterface.promptDialog(
                            $deepFreeze({
                                promptTitle: template.title,
                                promptMessage: replaceParameters(template.description || '', parameters),
                                defaultValue: replaceParameters(preparedContent, parameters),

                                // TODO: [🧠] !! Figure out how to define placeholder in .ptbk.md file
                                placeholder: undefined,
                                priority,
                            }),
                        );
                        break templateType;

                    // <- case: [🅱]

                    default:
                        throw new PipelineExecutionError(
                            spaceTrim(
                                (block) => `
                                  Unknown execution type "${(template as TODO_any).templateType}"

                                  ${block(pipelineIdentification)}
                              `,
                            ),
                        );
                }
            }

            if (!isJokerAttempt && template.postprocessingFunctionNames) {
                for (const functionName of template.postprocessingFunctionNames) {
                    let postprocessingError = null;

                    scripts: for (const scriptTools of arrayableToArray(tools.script)) {
                        try {
                            $ongoingTemplateResult.$resultString = await scriptTools.execute({
                                scriptLanguage: `javascript` /* <- TODO: Try it in each languages; In future allow postprocessing with arbitrary combination of languages to combine */,
                                script: `${functionName}(resultString)`,
                                parameters: {
                                    resultString: $ongoingTemplateResult.$resultString || '',
                                    // Note: No ...parametersForTemplate, because working with result only
                                },
                            });

                            postprocessingError = null;
                            break scripts;
                        } catch (error) {
                            if (!(error instanceof Error)) {
                                throw error;
                            }

                            if (error instanceof UnexpectedError) {
                                throw error;
                            }

                            postprocessingError = error;
                            $ongoingTemplateResult.$scriptPipelineExecutionErrors.push(error);
                        }
                    }

                    if (postprocessingError) {
                        throw postprocessingError;
                    }
                }
            }

            // TODO: [💝] Unite object for expecting amount and format
            if (template.format) {
                if (template.format === 'JSON') {
                    if (!isValidJsonString($ongoingTemplateResult.$resultString || '')) {
                        // TODO: [🏢] Do more universally via `FormatDefinition`

                        try {
                            $ongoingTemplateResult.$resultString = extractJsonBlock(
                                $ongoingTemplateResult.$resultString || '',
                            );
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
                              Unknown format "${template.format}"

                              ${block(pipelineIdentification)}
                          `,
                        ),
                    );
                }
            }

            // TODO: [💝] Unite object for expecting amount and format
            if (template.expectations) {
                checkExpectations(template.expectations, $ongoingTemplateResult.$resultString || '');
            }

            break attempts;
        } catch (error) {
            if (!(error instanceof ExpectError)) {
                throw error;
            }

            $ongoingTemplateResult.$expectError = error;
        } finally {
            if (
                !isJokerAttempt &&
                template.templateType === 'PROMPT_TEMPLATE' &&
                $ongoingTemplateResult.$prompt!
                //    <- Note:  [2] When some expected parameter is not defined, error will occur in replaceParameters
                //              In that case we don’t want to make a report about it because it’s not a llm execution error
            ) {
                // TODO: [🧠] Maybe put other templateTypes into report
                $executionReport.promptExecutions.push({
                    prompt: {
                        ...$ongoingTemplateResult.$prompt,
                        // <- TODO: [🧠] How to pick everyhing except `pipelineUrl`
                    } as really_any,
                    result: $ongoingTemplateResult.$result || undefined,
                    error:
                        $ongoingTemplateResult.$expectError === null
                            ? undefined
                            : serializeError($ongoingTemplateResult.$expectError),
                });
            }
        }

        if ($ongoingTemplateResult.$expectError !== null && attempt === maxAttempts - 1) {
            throw new PipelineExecutionError(
                spaceTrim(
                    (block) => `
                      LLM execution failed ${maxExecutionAttempts}x

                      ${block(pipelineIdentification)}

                      ---
                      The Prompt:
                      ${block(
                          ($ongoingTemplateResult.$prompt?.content || '')
                              .split('\n')
                              .map((line) => `> ${line}`)
                              .join('\n'),
                      )}

                      Last error ${$ongoingTemplateResult.$expectError?.name || ''}:
                      ${block(
                          ($ongoingTemplateResult.$expectError?.message || '')
                              .split('\n')
                              .map((line) => `> ${line}`)
                              .join('\n'),
                      )}

                      Last result:
                      ${block(
                          $ongoingTemplateResult.$resultString === null
                              ? 'null'
                              : $ongoingTemplateResult.$resultString
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

    if ($ongoingTemplateResult.$resultString === null) {
        throw new UnexpectedError(
            spaceTrim(
                (block) => `
                  Something went wrong and prompt result is null

                  ${block(pipelineIdentification)}
              `,
            ),
        );
    }

    return $ongoingTemplateResult.$resultString;
}

/**
 * TODO: Break into smaller functions
 */
