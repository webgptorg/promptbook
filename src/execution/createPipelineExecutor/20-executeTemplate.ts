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
import type { ChatPrompt, CompletionPrompt, EmbeddingPrompt, Prompt } from '../../types/Prompt';
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
import type { ChatPromptResult, CompletionPromptResult, EmbeddingPromptResult, PromptResult } from '../PromptResult';
import { checkExpectations } from '../utils/checkExpectations';
import { getReservedParametersForTemplate } from './getReservedParametersForTemplate';

/**
 * @@@
 */
type executeSingleTemplateOptions = {
    /**
     * @@@
     */
    currentTemplate: ReadonlyDeep<TemplateJson>;

    /**
     * @@@
     */
    preparedPipeline: ReadonlyDeep<PipelineJson>;

    /**
     * @@@
     */
    parametersToPass: Readonly<Parameters>;

    /**
     * @@@
     */
    tools: Omit<ExecutionTools, 'llm'>;

    /**
     * @@@
     */
    llmTools: MultipleLlmExecutionTools;

    /**
     * @@@
     */
    onProgress: (taskProgress: TaskProgress) => Promisable<void>;

    /**
     * @@@
     */
    maxExecutionAttempts: number;

    /**
     * @@@
     */
    $executionReport: ExecutionReportJson;

    /**
     * @@@
     */
    pipelineIdentification: string;
};

/**
 * @private @@@
 */
export async function executeTemplate(options: executeSingleTemplateOptions): Promise<Readonly<Parameters>> {
    const {
        currentTemplate,
        preparedPipeline,
        parametersToPass,
        tools,
        llmTools,
        onProgress,
        maxExecutionAttempts,
        $executionReport,
        pipelineIdentification,
    } = options;

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
        ...(await getReservedParametersForTemplate(preparedPipeline, currentTemplate, pipelineIdentification)),
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

    // Note: Now we can freeze `parameters` because we are sure that all and only used parameters are defined
    Object.freeze(parameters);

    let prompt: Prompt;
    let chatResult: ChatPromptResult;
    let completionResult: CompletionPromptResult;
    let embeddingResult: EmbeddingPromptResult;
    // Note: [🤖]
    let result: PromptResult | null = null;
    let resultString: string | null = null;
    let expectError: ExpectError | null = null;
    let scriptPipelineExecutionErrors: Array<Error>;
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

        result = null;
        resultString = null;
        expectError = null;

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
                resultString = parameters[jokerParameterName!]!;
            }
        }

        try {
            if (!isJokerAttempt) {
                templateType: switch (currentTemplate.templateType) {
                    case 'SIMPLE_TEMPLATE':
                        resultString = replaceParameters(preparedContent, parameters);
                        break templateType;

                    case 'PROMPT_TEMPLATE':
                        {
                            const modelRequirements = {
                                modelVariant: 'CHAT',
                                ...(preparedPipeline.defaultModelRequirements || {}),
                                ...(currentTemplate.modelRequirements || {}),
                            } satisfies ModelRequirements;

                            prompt = {
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
                                    chatResult = await llmTools.callChatModel($deepFreeze(prompt) as ChatPrompt);
                                    // TODO: [🍬] Destroy chatThread
                                    result = chatResult;
                                    resultString = chatResult.content;
                                    break variant;
                                case 'COMPLETION':
                                    completionResult = await llmTools.callCompletionModel(
                                        $deepFreeze(prompt) as CompletionPrompt,
                                    );
                                    result = completionResult;
                                    resultString = completionResult.content;
                                    break variant;

                                case 'EMBEDDING':
                                    // TODO: [🧠] This is weird, embedding model can not be used such a way in the pipeline
                                    embeddingResult = await llmTools.callEmbeddingModel(
                                        $deepFreeze(prompt) as EmbeddingPrompt,
                                    );
                                    result = embeddingResult;
                                    resultString = embeddingResult.content.join(',');
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

                        // TODO: DRY [1]
                        scriptPipelineExecutionErrors = [];

                        // TODO: DRY [☯]
                        scripts: for (const scriptTools of arrayableToArray(tools.script)) {
                            try {
                                resultString = await scriptTools.execute(
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

                                scriptPipelineExecutionErrors.push(error);
                            }
                        }

                        if (resultString !== null) {
                            break templateType;
                        }

                        if (scriptPipelineExecutionErrors.length === 1) {
                            throw scriptPipelineExecutionErrors[0];
                        } else {
                            throw new PipelineExecutionError(
                                spaceTrim(
                                    (block) => `
                                        Script execution failed ${scriptPipelineExecutionErrors.length} times

                                        ${block(pipelineIdentification)}

                                        ${block(
                                            scriptPipelineExecutionErrors
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
                        resultString = await tools.userInterface.promptDialog(
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
                    // TODO: DRY [1]
                    scriptPipelineExecutionErrors = [];
                    let postprocessingError = null;

                    scripts: for (const scriptTools of arrayableToArray(tools.script)) {
                        try {
                            resultString = await scriptTools.execute({
                                scriptLanguage: `javascript` /* <- TODO: Try it in each languages; In future allow postprocessing with arbitrary combination of languages to combine */,
                                script: `${functionName}(resultString)`,
                                parameters: {
                                    resultString: resultString || '',
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
                            scriptPipelineExecutionErrors.push(error);
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
                    if (!isValidJsonString(resultString || '')) {
                        // TODO: [🏢] Do more universally via `FormatDefinition`

                        try {
                            resultString = extractJsonBlock(resultString || '');
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
                checkExpectations(currentTemplate.expectations, resultString || '');
            }

            break attempts;
        } catch (error) {
            if (!(error instanceof ExpectError)) {
                throw error;
            }

            expectError = error;
        } finally {
            if (
                !isJokerAttempt &&
                currentTemplate.templateType === 'PROMPT_TEMPLATE' &&
                prompt!
                //    <- Note:  [2] When some expected parameter is not defined, error will occur in replaceParameters
                //              In that case we don’t want to make a report about it because it’s not a llm execution error
            ) {
                // TODO: [🧠] Maybe put other templateTypes into report
                $executionReport.promptExecutions.push({
                    prompt: {
                        ...prompt,
                        // <- TODO: [🧠] How to pick everyhing except `pipelineUrl`
                    } as really_any,
                    result: result || undefined,
                    error: expectError === null ? undefined : serializeError(expectError),
                });
            }
        }

        if (expectError !== null && attempt === maxAttempts - 1) {
            throw new PipelineExecutionError(
                spaceTrim(
                    (block) => `
                        LLM execution failed ${maxExecutionAttempts}x

                        ${block(pipelineIdentification)}

                        ---
                        The Prompt:
                        ${block(
                            prompt.content
                                .split('\n')
                                .map((line) => `> ${line}`)
                                .join('\n'),
                        )}

                        Last error ${expectError?.name || ''}:
                        ${block(
                            (expectError?.message || '')
                                .split('\n')
                                .map((line) => `> ${line}`)
                                .join('\n'),
                        )}

                        Last result:
                        ${block(
                            resultString === null
                                ? 'null'
                                : resultString
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

    if (resultString === null) {
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
        parameterValue: resultString,
        // <- [🍸]
    });

    return Object.freeze({
        [currentTemplate.resultingParameterName]:
            resultString /* <- Note: Not need to detect parameter collision here because pipeline checks logic consistency during construction */,
    });
}

/**
 * TODO: [🤹‍♂️]
 */
