import { spaceTrim } from 'spacetrim';
import { Promisable, ReadonlyDeep } from 'type-fest';
import { extractParameterNamesFromTemplate } from '../../conversion/utils/extractParameterNamesFromTemplate';
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
import type { ChatPrompt } from '../../types/Prompt';
import type { CompletionPrompt } from '../../types/Prompt';
import type { EmbeddingPrompt } from '../../types/Prompt';
import type { Prompt } from '../../types/Prompt';
import type { TaskProgress } from '../../types/TaskProgress';
import type { Parameters } from '../../types/typeAliases';
import { arrayableToArray } from '../../utils/arrayableToArray';
import { keepUnused } from '../../utils/organization/keepUnused';
import type { really_any } from '../../utils/organization/really_any';
import type { TODO_any } from '../../utils/organization/TODO_any';
import { replaceParameters } from '../../utils/replaceParameters';
import { $deepFreeze } from '../../utils/serialization/$deepFreeze';
import { difference } from '../../utils/sets/difference';
import { union } from '../../utils/sets/union';
import type { ExecutionTools } from '../ExecutionTools';
import type { ChatPromptResult } from '../PromptResult';
import type { CompletionPromptResult } from '../PromptResult';
import type { EmbeddingPromptResult } from '../PromptResult';
import type { PromptResult } from '../PromptResult';
import { checkExpectations } from '../utils/checkExpectations';
import type { CreatePipelineExecutorSettings } from './00-CreatePipelineExecutorSettings';
import { getReservedParametersForTemplate } from './getReservedParametersForTemplate';
import { $OngoingTemplateResult } from './$OngoingTemplateResult';

/**
 * @@@
 *
 * @private internal type of `executeTemplate`
 */
type executeSingleTemplateOptions = {
    /**
     * @@@
     */
    readonly currentTemplate: ReadonlyDeep<TemplateJson>;

    /**
     * @@@
     */
    readonly preparedPipeline: ReadonlyDeep<PipelineJson>;

    /**
     * @@@
     */
    readonly parametersToPass: Readonly<Parameters>;

    /**
     * @@@
     */
    readonly tools: Omit<ExecutionTools, 'llm'>;

    /**
     * @@@
     */
    readonly llmTools: MultipleLlmExecutionTools;

    /**
     * @@@
     */
    readonly onProgress: (taskProgress: TaskProgress) => Promisable<void>;

    /**
     * Settings for the pipeline executor
     */
    readonly settings: CreatePipelineExecutorSettings;
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
export async function executeTemplate(options: executeSingleTemplateOptions): Promise<Readonly<Parameters>> {
    const {
        currentTemplate,
        preparedPipeline,
        parametersToPass,
        tools,
        llmTools,
        onProgress,
        settings,
        $executionReport,
        pipelineIdentification,
    } = options;
    const { maxExecutionAttempts } = settings;

    const name = `pipeline-executor-frame-${currentTemplate.name}`;
    const title = currentTemplate.title;
    const priority = preparedPipeline.templates.length - preparedPipeline.templates.indexOf(currentTemplate);

    await onProgress({
        name,
        title,
        isStarted: false,
        isDone: false,
        templateType: currentTemplate.templateType,
        parameterName: currentTemplate.resultingParameterName,
        parameterValue: null,
        // <- [🍸]
    });

    // Note: Check consistency of used and dependent parameters which was also done in `validatePipeline`, but it’s good to doublecheck
    const usedParameterNames = extractParameterNamesFromTemplate(currentTemplate);
    const dependentParameterNames = new Set(currentTemplate.dependentParameterNames);
    if (
        union(
            difference(usedParameterNames, dependentParameterNames),
            difference(dependentParameterNames, usedParameterNames),
            // <- TODO: [💯]
        ).size !== 0
    ) {
        throw new UnexpectedError(
            spaceTrim(
                (block) => `
                    Dependent parameters are not consistent with used parameters:

                    ${block(pipelineIdentification)}

                    Dependent parameters:
                    ${Array.from(dependentParameterNames)
                        .map((name) => `{${name}}`)
                        .join(', ')}

                    Used parameters:
                    ${Array.from(usedParameterNames)
                        .map((name) => `{${name}}`)
                        .join(', ')}

                `,
            ),
        );
    }

    const definedParameters: Parameters = Object.freeze({
        ...(await getReservedParametersForTemplate({
            preparedPipeline,
            template: currentTemplate,
            pipelineIdentification,
        })),
        ...parametersToPass,
    });

    const definedParameterNames = new Set(Object.keys(definedParameters));
    const parameters: Parameters = {};

    // Note: [2] Check that all used parameters are defined and removing unused parameters for this template
    for (const parameterName of Array.from(union(definedParameterNames, usedParameterNames, dependentParameterNames))) {
        // Situation: Parameter is defined and used
        if (definedParameterNames.has(parameterName) && usedParameterNames.has(parameterName)) {
            parameters[parameterName] = definedParameters[parameterName]!;
        }
        // Situation: Parameter is defined but NOT used
        else if (definedParameterNames.has(parameterName) && !usedParameterNames.has(parameterName)) {
            // Do not pass this parameter to prompt
        }
        // Situation: Parameter is NOT defined BUT used
        else if (!definedParameterNames.has(parameterName) && usedParameterNames.has(parameterName)) {
            // Houston, we have a problem
            // Note: Checking part is also done in `validatePipeline`, but it’s good to doublecheck
            throw new UnexpectedError(
                spaceTrim(
                    (block) => `
                        Parameter {${parameterName}} is NOT defined
                        BUT used in template "${currentTemplate.title || currentTemplate.name}"

                        This should be catched in \`validatePipeline\`

                        ${block(pipelineIdentification)}

                    `,
                ),
            );
        }
    }

    // Note: Now we can freeze `parameters` because we are sure that all and only used parameters are defined and are not going to be changed
    Object.freeze(parameters);

    const $ongoingResult: $OngoingTemplateResult = {
        $result: null,
        $resultString: null,
        $expectError: null,
        $scriptPipelineExecutionErrors: [],
    };

    const maxAttempts = currentTemplate.templateType === 'DIALOG_TEMPLATE' ? Infinity : maxExecutionAttempts;
    const jokerParameterNames = currentTemplate.jokerParameterNames || [];

    const preparedContent = (currentTemplate.preparedContent || '{content}')
        .split('{content}')
        .join(currentTemplate.content);
    //    <- TODO: [🍵] Use here `replaceParameters` to replace {websiteContent} with option to ignore missing parameters

    //------------------------------------
    /*




  TODO: !!!!!! Somewhere here should be `FOREACH` logic




  */
    //------------------------------------

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

        $ongoingResult.$result = null;
        $ongoingResult.$resultString = null;
        $ongoingResult.$expectError = null;

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
                $ongoingResult.$resultString = parameters[jokerParameterName!]!;
            }
        }

        try {
            if (!isJokerAttempt) {
                templateType: switch (currentTemplate.templateType) {
                    case 'SIMPLE_TEMPLATE':
                        $ongoingResult.$resultString = replaceParameters(preparedContent, parameters);
                        break templateType;

                    case 'PROMPT_TEMPLATE':
                        {
                            const modelRequirements = {
                                modelVariant: 'CHAT',
                                ...(preparedPipeline.defaultModelRequirements || {}),
                                ...(currentTemplate.modelRequirements || {}),
                            } satisfies ModelRequirements;

                            $ongoingResult.$prompt = {
                                title: currentTemplate.title,
                                pipelineUrl: `${
                                    preparedPipeline.pipelineUrl
                                        ? preparedPipeline.pipelineUrl
                                        : 'anonymous' /* <- TODO: [🧠] How to deal with anonymous pipelines, do here some auto-url like SHA-256 based ad-hoc identifier? */
                                }#${currentTemplate.name}`,
                                parameters,
                                content: preparedContent, // <- Note: For LLM execution, parameters are replaced in the content
                                modelRequirements,
                                expectations: {
                                    ...(preparedPipeline.personas.find(
                                        ({ name }) => name === currentTemplate.personaName,
                                    ) || {}),
                                    ...currentTemplate.expectations,
                                },
                                format: currentTemplate.format,
                                postprocessingFunctionNames: currentTemplate.postprocessingFunctionNames,
                            } as Prompt; // <- TODO: Not very good type guard

                            variant: switch (modelRequirements.modelVariant) {
                                case 'CHAT':
                                    $ongoingResult.$chatResult = await llmTools.callChatModel(
                                        $deepFreeze($ongoingResult.$prompt) as ChatPrompt,
                                    );
                                    // TODO: [🍬] Destroy chatThread
                                    $ongoingResult.$result = $ongoingResult.$chatResult;
                                    $ongoingResult.$resultString = $ongoingResult.$chatResult.content;
                                    break variant;
                                case 'COMPLETION':
                                    $ongoingResult.$completionResult = await llmTools.callCompletionModel(
                                        $deepFreeze($ongoingResult.$prompt) as CompletionPrompt,
                                    );
                                    $ongoingResult.$result = $ongoingResult.$completionResult;
                                    $ongoingResult.$resultString = $ongoingResult.$completionResult.content;
                                    break variant;

                                case 'EMBEDDING':
                                    // TODO: [🧠] This is weird, embedding model can not be used such a way in the pipeline
                                    $ongoingResult.$embeddingResult = await llmTools.callEmbeddingModel(
                                        $deepFreeze($ongoingResult.$prompt) as EmbeddingPrompt,
                                    );
                                    $ongoingResult.$result = $ongoingResult.$embeddingResult;
                                    $ongoingResult.$resultString = $ongoingResult.$embeddingResult.content.join(',');
                                    break variant;

                                // <- case [🤖]:

                                default:
                                    throw new PipelineExecutionError(
                                        spaceTrim(
                                            (block) => `
                                                Unknown model variant "${
                                                    (currentTemplate as really_any).modelRequirements.modelVariant
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
                        if (!currentTemplate.contentLanguage) {
                            throw new PipelineExecutionError(
                                spaceTrim(
                                    (block) => `
                                        Script language is not defined for SCRIPT TEMPLATE "${currentTemplate.name}"

                                        ${block(pipelineIdentification)}
                                    `,
                                ),
                            );
                        }

                        // TODO: DRY [☯]
                        scripts: for (const scriptTools of arrayableToArray(tools.script)) {
                            try {
                                $ongoingResult.$resultString = await scriptTools.execute(
                                    $deepFreeze({
                                        scriptLanguage: currentTemplate.contentLanguage,
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

                                $ongoingResult.$scriptPipelineExecutionErrors.push(error);
                            }
                        }

                        if ($ongoingResult.$resultString !== null) {
                            break templateType;
                        }

                        if ($ongoingResult.$scriptPipelineExecutionErrors.length === 1) {
                            throw $ongoingResult.$scriptPipelineExecutionErrors[0];
                        } else {
                            throw new PipelineExecutionError(
                                spaceTrim(
                                    (block) => `
                                        Script execution failed ${$ongoingResult.$scriptPipelineExecutionErrors.length}x

                                        ${block(pipelineIdentification)}

                                        ${block(
                                            $ongoingResult.$scriptPipelineExecutionErrors
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
                        $ongoingResult.$resultString = await tools.userInterface.promptDialog(
                            $deepFreeze({
                                promptTitle: currentTemplate.title,
                                promptMessage: replaceParameters(currentTemplate.description || '', parameters),
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
                                    Unknown execution type "${(currentTemplate as TODO_any).templateType}"

                                    ${block(pipelineIdentification)}
                                `,
                            ),
                        );
                }
            }

            if (!isJokerAttempt && currentTemplate.postprocessingFunctionNames) {
                for (const functionName of currentTemplate.postprocessingFunctionNames) {
                    let postprocessingError = null;

                    scripts: for (const scriptTools of arrayableToArray(tools.script)) {
                        try {
                            $ongoingResult.$resultString = await scriptTools.execute({
                                scriptLanguage: `javascript` /* <- TODO: Try it in each languages; In future allow postprocessing with arbitrary combination of languages to combine */,
                                script: `${functionName}(resultString)`,
                                parameters: {
                                    resultString: $ongoingResult.$resultString || '',
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
                            $ongoingResult.$scriptPipelineExecutionErrors.push(error);
                        }
                    }

                    if (postprocessingError) {
                        throw postprocessingError;
                    }
                }
            }

            // TODO: [💝] Unite object for expecting amount and format
            if (currentTemplate.format) {
                if (currentTemplate.format === 'JSON') {
                    if (!isValidJsonString($ongoingResult.$resultString || '')) {
                        // TODO: [🏢] Do more universally via `FormatDefinition`

                        try {
                            $ongoingResult.$resultString = extractJsonBlock($ongoingResult.$resultString || '');
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
                                Unknown format "${currentTemplate.format}"

                                ${block(pipelineIdentification)}
                            `,
                        ),
                    );
                }
            }

            // TODO: [💝] Unite object for expecting amount and format
            if (currentTemplate.expectations) {
                checkExpectations(currentTemplate.expectations, $ongoingResult.$resultString || '');
            }

            break attempts;
        } catch (error) {
            if (!(error instanceof ExpectError)) {
                throw error;
            }

            $ongoingResult.$expectError = error;
        } finally {
            if (
                !isJokerAttempt &&
                currentTemplate.templateType === 'PROMPT_TEMPLATE' &&
                $ongoingResult.$prompt!
                //    <- Note:  [2] When some expected parameter is not defined, error will occur in replaceParameters
                //              In that case we don’t want to make a report about it because it’s not a llm execution error
            ) {
                // TODO: [🧠] Maybe put other templateTypes into report
                $executionReport.promptExecutions.push({
                    prompt: {
                        ...$ongoingResult.$prompt,
                        // <- TODO: [🧠] How to pick everyhing except `pipelineUrl`
                    } as really_any,
                    result: $ongoingResult.$result || undefined,
                    error:
                        $ongoingResult.$expectError === null ? undefined : serializeError($ongoingResult.$expectError),
                });
            }
        }

        if ($ongoingResult.$expectError !== null && attempt === maxAttempts - 1) {
            throw new PipelineExecutionError(
                spaceTrim(
                    (block) => `
                        LLM execution failed ${maxExecutionAttempts}x

                        ${block(pipelineIdentification)}

                        ---
                        The Prompt:
                        ${block(
                            ($ongoingResult.$prompt?.content || '')
                                .split('\n')
                                .map((line) => `> ${line}`)
                                .join('\n'),
                        )}

                        Last error ${$ongoingResult.$expectError?.name || ''}:
                        ${block(
                            ($ongoingResult.$expectError?.message || '')
                                .split('\n')
                                .map((line) => `> ${line}`)
                                .join('\n'),
                        )}

                        Last result:
                        ${block(
                            $ongoingResult.$resultString === null
                                ? 'null'
                                : $ongoingResult.$resultString
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

    //------------------------------------
    /*









  */
    //------------------------------------

    if ($ongoingResult.$resultString === null) {
        throw new UnexpectedError(
            spaceTrim(
                (block) => `
                    Something went wrong and prompt result is null

                    ${block(pipelineIdentification)}
                `,
            ),
        );
    }

    await onProgress({
        name,
        title,
        isStarted: true,
        isDone: true,
        templateType: currentTemplate.templateType,
        parameterName: currentTemplate.resultingParameterName,
        parameterValue: $ongoingResult.$resultString,
        // <- [🍸]
    });

    return Object.freeze({
        [currentTemplate.resultingParameterName]:
            $ongoingResult.$resultString /* <- Note: Not need to detect parameter collision here because pipeline checks logic consistency during construction */,
    });
}

/**
 * TODO: [🤹‍♂️]
 */
