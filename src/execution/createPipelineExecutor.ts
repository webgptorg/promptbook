import { spaceTrim } from 'spacetrim';
import type { Promisable } from 'type-fest';
import { LOOP_LIMIT } from '../config';
import { MAX_EXECUTION_ATTEMPTS } from '../config';
import { MAX_PARALLEL_COUNT } from '../config';
import { RESERVED_PARAMETER_NAMES } from '../config';
import { extractParametersFromPromptTemplate } from '../conversion/utils/extractParametersFromPromptTemplate';
import { validatePipeline } from '../conversion/validation/validatePipeline';
import { ExpectError } from '../errors/_ExpectError';
import { PipelineExecutionError } from '../errors/PipelineExecutionError';
import { UnexpectedError } from '../errors/UnexpectedError';
import { isValidJsonString } from '../formats/json/utils/isValidJsonString';
import { joinLlmExecutionTools } from '../llm-providers/multiple/joinLlmExecutionTools';
import { isPipelinePrepared } from '../prepare/isPipelinePrepared';
import { preparePipeline } from '../prepare/preparePipeline';
import type { ExecutionReportJson } from '../types/execution-report/ExecutionReportJson';
import type { PipelineJson } from '../types/PipelineJson/PipelineJson';
import type { PromptTemplateJson } from '../types/PipelineJson/PromptTemplateJson';
import type { ChatPrompt } from '../types/Prompt';
import type { CompletionPrompt } from '../types/Prompt';
import type { EmbeddingPrompt } from '../types/Prompt';
import type { Prompt } from '../types/Prompt';
import type { TaskProgress } from '../types/TaskProgress';
import type { Parameters } from '../types/typeAliases';
import type { ReservedParameters } from '../types/typeAliases';
import type { string_markdown } from '../types/typeAliases';
import type { string_name } from '../types/typeAliases';
import type { string_parameter_value } from '../types/typeAliases';
import { arrayableToArray } from '../utils/arrayableToArray';
import { deepFreeze } from '../utils/deepFreeze';
import { deepFreezeWithSameType } from '../utils/deepFreeze';
import type { really_any } from '../utils/organization/really_any';
import type { TODO_any } from '../utils/organization/TODO_any';
import { TODO_USE } from '../utils/organization/TODO_USE';
import { replaceParameters } from '../utils/replaceParameters';
import { difference } from '../utils/sets/difference';
import { union } from '../utils/sets/union';
import { PROMPTBOOK_VERSION } from '../version';
import type { ExecutionTools } from './ExecutionTools';
import type { PipelineExecutor } from './PipelineExecutor';
import type { ChatPromptResult } from './PromptResult';
import type { CompletionPromptResult } from './PromptResult';
import type { EmbeddingPromptResult } from './PromptResult';
import type { PromptResult } from './PromptResult';
import { addUsage } from './utils/addUsage';
import { ZERO_USAGE } from './utils/addUsage';
import { checkExpectations } from './utils/checkExpectations';

type CreatePipelineExecutorSettings = {
    /**
     * When executor does not satisfy expectations it will be retried this amount of times
     *
     * @default MAX_EXECUTION_ATTEMPTS
     */
    readonly maxExecutionAttempts?: number;

    /**
     * Maximum number of tasks running in parallel
     *
     * @default MAX_PARALLEL_COUNT
     */
    readonly maxParallelCount?: number;

    /**
     * If true, the preparation logs additional information
     *
     * @default false
     */
    readonly isVerbose?: boolean;
};

/**
 * Options for `createPipelineExecutor`
 */
interface CreatePipelineExecutorOptions {
    /**
     * The pipeline to be executed
     */
    readonly pipeline: PipelineJson;

    /**
     * The execution tools to be used during the execution of the pipeline
     */
    readonly tools: ExecutionTools;

    /**
     * Optional settings for the pipeline executor
     */
    readonly settings?: Partial<CreatePipelineExecutorSettings>;
}

/**
 * Creates executor function from pipeline and execution tools.
 *
 * @returns The executor function
 * @throws {PipelineLogicError} on logical error in the pipeline
 */
export function createPipelineExecutor(options: CreatePipelineExecutorOptions): PipelineExecutor {
    const { pipeline: rawPipeline, tools, settings = {} } = options;
    const {
        maxExecutionAttempts = MAX_EXECUTION_ATTEMPTS,
        maxParallelCount = MAX_PARALLEL_COUNT,
        isVerbose = false,
    } = settings;

    validatePipeline(rawPipeline);

    const llmTools = joinLlmExecutionTools(...arrayableToArray(tools.llm));

    let pipeline: PipelineJson;

    if (isPipelinePrepared(rawPipeline)) {
        pipeline = rawPipeline;
    } else {
        console.warn(
            spaceTrim(`
                Pipeline ${rawPipeline.pipelineUrl || rawPipeline.sourceFile || rawPipeline.title} is not prepared

                It will be prepared ad-hoc before the first execution
                But it is recommended to prepare the pipeline during collection preparation

                @see more at https://ptbk.io/prepare-pipeline
            `),
        );
    }

    const pipelineExecutor: PipelineExecutor = async (
        inputParameters: Parameters,
        onProgress?: (taskProgress: TaskProgress) => Promisable<void>,
    ) => {
        if (pipeline === undefined) {
            pipeline = await preparePipeline(rawPipeline, {
                llmTools,
                isVerbose,
                maxParallelCount,
            });
        }

        const executionReport: ExecutionReportJson = {
            pipelineUrl: pipeline.pipelineUrl,
            title: pipeline.title,
            promptbookUsedVersion: PROMPTBOOK_VERSION,
            promptbookRequestedVersion: pipeline.promptbookVersion,
            description: pipeline.description,
            promptExecutions: [],
        };

        // Note: Check that all input input parameters are defined
        for (const parameter of pipeline.parameters.filter(({ isInput }) => isInput)) {
            if (inputParameters[parameter.name] === undefined) {
                return deepFreezeWithSameType({
                    isSuccessful: false,
                    errors: [
                        new PipelineExecutionError(`Parameter {${parameter.name}} is required as an input parameter`),
                        // <- TODO: !!!!! Test this error
                    ],
                    executionReport,
                    outputParameters: {},
                    usage: ZERO_USAGE,
                });
            }
        }

        const errors: Array<PipelineExecutionError> = [];

        // Note: Check that no extra input parameters are passed
        for (const parameterName of Object.keys(inputParameters)) {
            const parameter = pipeline.parameters.find(({ name }) => name === parameterName);

            if (parameter === undefined) {
                errors.push(
                    new PipelineExecutionError(`Extra parameter {${parameterName}} is passed as input parameter`),
                    // <- TODO: !!!!! Test this error
                );
            } else if (parameter.isInput === false) {
                // TODO: [🧠] This should be also non-critical error
                return deepFreezeWithSameType({
                    isSuccessful: false,
                    errors: [
                        new PipelineExecutionError(
                            `Parameter {${parameter.name}} is passed as input parameter but is not input`,
                        ),
                        // <- TODO: !!!!! Test this error
                    ],
                    executionReport,
                    outputParameters: {},
                    usage: ZERO_USAGE,
                });
            }
        }

        let parametersToPass: Parameters = inputParameters;

        async function getContextForTemplate( // <- TODO: [🧠][🥜]
            template: PromptTemplateJson,
        ): Promise<string_parameter_value & string_markdown> {
            // TODO: !!!!!! Implement Better - use real index and keyword search

            TODO_USE(template);
            return pipeline.knowledgePieces.map(({ content }) => `- ${content}`).join('\n');
        }

        async function getReservedParametersForTemplate(template: PromptTemplateJson): Promise<ReservedParameters> {
            const context = await getContextForTemplate(template);
            const currentDate = new Date().toISOString(); // <- TODO: [🧠] Better

            const reservedParameters: ReservedParameters = {
                context,
                currentDate,
            };

            // Note: Doublecheck that ALL reserved parameters are defined:
            for (const parameterName of RESERVED_PARAMETER_NAMES) {
                if (reservedParameters[parameterName] === undefined) {
                    throw new UnexpectedError(`Reserved parameter {${parameterName}} is not defined`);
                }
            }

            return reservedParameters;
        }

        async function executeSingleTemplate(currentTemplate: PromptTemplateJson) {
            // <- TODO: [🧠][🥜]
            const name = `pipeline-executor-frame-${currentTemplate.name}`;
            const title = currentTemplate.title;
            const priority = pipeline.promptTemplates.length - pipeline.promptTemplates.indexOf(currentTemplate);

            if (onProgress /* <- [3] */) {
                await onProgress({
                    name,
                    title,
                    isStarted: false,
                    isDone: false,
                    blockType: currentTemplate.blockType,
                    parameterName: currentTemplate.resultingParameterName,
                    parameterValue: null,
                    // <- [3]
                });
            }

            // Note: Check consistency of used and dependent parameters which was also done in `validatePipeline`, but it’s good to doublecheck
            const usedParameterNames = extractParametersFromPromptTemplate(currentTemplate);
            const dependentParameterNames = new Set(currentTemplate.dependentParameterNames);
            if (
                union(
                    difference(usedParameterNames, dependentParameterNames),
                    difference(dependentParameterNames, usedParameterNames),
                    // <- TODO: [💯]
                ).size !== 0
            ) {
                throw new UnexpectedError(
                    spaceTrim(`
                        Dependent parameters are not consistent used parameters:

                        Dependent parameters:
                        ${Array.from(dependentParameterNames).join(', ')}

                        Used parameters:
                        ${Array.from(usedParameterNames).join(', ')}

                    `),
                );
            }

            const definedParameters: Parameters = Object.freeze({
                ...(await getReservedParametersForTemplate(currentTemplate)),
                ...parametersToPass,
            });

            const definedParameterNames = new Set(Object.keys(definedParameters));
            const parameters: Parameters = {};

            // Note: [2] Check that all used parameters are defined and removing unused parameters for this template
            for (const parameterName of Array.from(
                union(definedParameterNames, usedParameterNames, dependentParameterNames),
            )) {
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
                        spaceTrim(`
                            Parameter {${parameterName}} is NOT defined
                            BUT used in template "${currentTemplate.title || currentTemplate.name}"

                            This should be catched in \`validatePipeline\`

                        `),
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
            const maxAttempts = currentTemplate.blockType === 'PROMPT_DIALOG' ? Infinity : maxExecutionAttempts;
            const jokerParameterNames = currentTemplate.jokerParameterNames || [];

            attempts: for (let attempt = -jokerParameterNames.length; attempt < maxAttempts; attempt++) {
                const isJokerAttempt = attempt < 0;
                const jokerParameterName = jokerParameterNames[jokerParameterNames.length + attempt];

                if (isJokerAttempt && !jokerParameterName) {
                    throw new UnexpectedError(`Joker not found in attempt ${attempt}`);
                }

                result = null;
                resultString = null;
                expectError = null;

                if (isJokerAttempt) {
                    if (parameters[jokerParameterName!] === undefined) {
                        throw new PipelineExecutionError(`Joker parameter {${jokerParameterName}} not defined`);
                        // <- TODO: This is maybe `PipelineLogicError` which should be detected in `validatePipeline` and here just thrown as `UnexpectedError`
                    } else {
                        resultString = parameters[jokerParameterName!]!;
                    }
                }

                try {
                    if (!isJokerAttempt) {
                        blockType: switch (currentTemplate.blockType) {
                            case 'SIMPLE_TEMPLATE':
                                resultString = replaceParameters(currentTemplate.content, parameters);
                                break blockType;

                            case 'PROMPT_TEMPLATE':
                                prompt = {
                                    title: currentTemplate.title,
                                    pipelineUrl: `${
                                        pipeline.pipelineUrl
                                            ? pipeline.pipelineUrl
                                            : 'anonymous' /* <- TODO: [🧠] How to deal with anonymous pipelines, do here some auto-url like SHA-256 based ad-hoc identifier? */
                                    }#${currentTemplate.name}`,
                                    parameters,
                                    content: currentTemplate.content, // <- Note: For LLM execution, parameters are replaced in the content
                                    modelRequirements: currentTemplate.modelRequirements!,
                                    expectations: {
                                        ...(pipeline.personas.find(
                                            ({ name }) => name === currentTemplate.personaName,
                                        ) || {}),
                                        ...currentTemplate.expectations,
                                    },
                                    expectFormat: currentTemplate.expectFormat,
                                    postprocessing: (currentTemplate.postprocessingFunctionNames || []).map(
                                        (functionName) => async (result: string) => {
                                            // TODO: DRY [☯]
                                            const errors: Array<Error> = [];
                                            for (const scriptTools of arrayableToArray(tools.script)) {
                                                try {
                                                    return await scriptTools.execute({
                                                        scriptLanguage: `javascript` /* <- TODO: Try it in each languages; In future allow postprocessing with arbitrary combination of languages to combine */,
                                                        script: `${functionName}(result)`,
                                                        parameters: {
                                                            result: result || '',
                                                            // Note: No ...parametersForTemplate, because working with result only
                                                        },
                                                    });
                                                } catch (error) {
                                                    if (!(error instanceof Error)) {
                                                        throw error;
                                                    }

                                                    if (error instanceof UnexpectedError) {
                                                        throw error;
                                                    }

                                                    errors.push(error);
                                                }
                                            }

                                            if (errors.length === 0) {
                                                throw new PipelineExecutionError(
                                                    'Postprocessing in LlmExecutionTools failed because no ScriptExecutionTools were provided',
                                                );
                                            } else if (errors.length === 1) {
                                                throw errors[0];
                                            } else {
                                                throw new PipelineExecutionError(
                                                    spaceTrim(
                                                        (block) => `
                                                        Postprocessing in LlmExecutionTools failed ${errors.length}x

                                                        ${block(
                                                            errors.map((error) => '- ' + error.message).join('\n\n'),
                                                        )}
                                                      `,
                                                    ),
                                                );
                                            }
                                        },
                                    ),
                                } as Prompt;

                                variant: switch (currentTemplate.modelRequirements!.modelVariant) {
                                    case 'CHAT':
                                        chatResult = await llmTools.callChatModel(deepFreeze(prompt) as ChatPrompt);
                                        // TODO: [🍬] Destroy chatThread
                                        result = chatResult;
                                        resultString = chatResult.content;
                                        break variant;
                                    case 'COMPLETION':
                                        completionResult = await llmTools.callCompletionModel(
                                            deepFreeze(prompt) as CompletionPrompt,
                                        );
                                        result = completionResult;
                                        resultString = completionResult.content;
                                        break variant;

                                    case 'EMBEDDING':
                                        embeddingResult = await llmTools.callEmbeddingModel(
                                            deepFreeze(prompt) as EmbeddingPrompt,
                                        );
                                        result = embeddingResult;
                                        resultString = embeddingResult.content.join(',');
                                        break variant;

                                    // <- case [🤖]:

                                    default:
                                        throw new PipelineExecutionError(
                                            `Unknown model variant "${
                                                (currentTemplate as really_any).modelRequirements.modelVariant
                                            }"`,
                                        );
                                }

                                break;

                            case 'SCRIPT':
                                if (arrayableToArray(tools.script).length === 0) {
                                    throw new PipelineExecutionError('No script execution tools are available');
                                }
                                if (!currentTemplate.contentLanguage) {
                                    throw new PipelineExecutionError(
                                        `Script language is not defined for prompt template "${currentTemplate.name}"`,
                                    );
                                }

                                // TODO: DRY [1]

                                scriptPipelineExecutionErrors = [];

                                // TODO: DRY [☯]
                                scripts: for (const scriptTools of arrayableToArray(tools.script)) {
                                    try {
                                        resultString = await scriptTools.execute(
                                            deepFreeze({
                                                scriptLanguage: currentTemplate.contentLanguage,
                                                script: currentTemplate.content, // <- Note: For Script execution, parameters are used as variables
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
                                    break blockType;
                                }

                                if (scriptPipelineExecutionErrors.length === 1) {
                                    throw scriptPipelineExecutionErrors[0];
                                } else {
                                    throw new PipelineExecutionError(
                                        spaceTrim(
                                            (block) => `
                                              Script execution failed ${scriptPipelineExecutionErrors.length} times

                                              ${block(
                                                  scriptPipelineExecutionErrors
                                                      .map((error) => '- ' + error.message)
                                                      .join('\n\n'),
                                              )}
                                          `,
                                        ),
                                    );
                                }

                                // Note: This line is unreachable because of the break blockType above
                                break blockType;

                            case 'PROMPT_DIALOG':
                                if (tools.userInterface === undefined) {
                                    throw new PipelineExecutionError('User interface tools are not available');
                                }

                                // TODO: [🌹] When making next attempt for `PROMPT DIALOG`, preserve the previous user input
                                resultString = await tools.userInterface.promptDialog(
                                    deepFreeze({
                                        promptTitle: currentTemplate.title,
                                        promptMessage: replaceParameters(currentTemplate.description || '', parameters),
                                        defaultValue: replaceParameters(currentTemplate.content, parameters),

                                        // TODO: [🧠] !! Figure out how to define placeholder in .ptbk.md file
                                        placeholder: undefined,
                                        priority,
                                    }),
                                );
                                break blockType;

                            // <- case: [🩻]

                            default:
                                throw new PipelineExecutionError(
                                    `Unknown execution type "${(currentTemplate as TODO_any).blockType}"`,
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
                    if (currentTemplate.expectFormat) {
                        if (currentTemplate.expectFormat === 'JSON') {
                            if (!isValidJsonString(resultString || '')) {
                                throw new ExpectError('Expected valid JSON string');
                            }
                        } else {
                            // TODO: Here should be fatal errror which breaks through the retry loop
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

                    if (error instanceof UnexpectedError) {
                        throw error;
                    }

                    expectError = error;
                } finally {
                    if (
                        !isJokerAttempt &&
                        currentTemplate.blockType === 'PROMPT_TEMPLATE' &&
                        prompt!
                        //    <- Note:  [2] When some expected parameter is not defined, error will occur in replaceParameters
                        //              In that case we don’t want to make a report about it because it’s not a llm execution error
                    ) {
                        // TODO: [🧠] Maybe put other blockTypes into report
                        executionReport.promptExecutions.push({
                            prompt: {
                                title: currentTemplate.title /* <- Note: If title in pipeline contains emojis, pass it innto report */,
                                content: prompt.content,
                                modelRequirements: prompt.modelRequirements,
                                expectations: prompt.expectations,
                                expectFormat: prompt.expectFormat,
                                // <- Note: Do want to pass ONLY wanted information to the report
                            },
                            result: result || undefined,
                            error: expectError || undefined,
                        });
                    }
                }

                if (expectError !== null && attempt === maxAttempts - 1) {
                    throw new PipelineExecutionError(
                        spaceTrim(
                            (block) => `
                              LLM execution failed ${maxExecutionAttempts}x

                              ---
                              Last error ${expectError?.name || ''}:
                              ${block(expectError?.message || '')}

                              Last result:
                              ${resultString}
                              ---
                          `,
                        ),
                    );
                }
            }

            if (resultString === null) {
                throw new UnexpectedError('Something went wrong and prompt result is null');
            }

            if (onProgress /* <- [3] */) {
                onProgress({
                    name,
                    title,
                    isStarted: true,
                    isDone: true,
                    blockType: currentTemplate.blockType,
                    parameterName: currentTemplate.resultingParameterName,
                    parameterValue: resultString,
                    // <- [3]
                });
            }

            parametersToPass = Object.freeze({
                ...parametersToPass,
                [currentTemplate.resultingParameterName]:
                    resultString /* <- Note: Not need to detect parameter collision here because pipeline checks logic consistency during construction */,
            });
        }

        function filterJustOutputParameters(): Parameters {
            const outputParameters: Parameters = {};

            // Note: Filter ONLY output parameters
            for (const parameter of pipeline.parameters.filter(({ isOutput }) => isOutput)) {
                if (parametersToPass[parameter.name] === undefined) {
                    // [4]
                    errors.push(
                        new PipelineExecutionError(
                            `Parameter {${parameter.name}} is required as an output parameter but not set in the pipeline`,
                        ),
                        // <- TODO: This should be maybe `UnexpectedError` because it should be catched during `validatePipeline`
                    );
                    continue;
                }
                outputParameters[parameter.name] = parametersToPass[parameter.name] || '';
            }

            return outputParameters;
        }

        try {
            let resovedParameters: Array<string_name> = pipeline.parameters
                .filter(({ isInput }) => isInput)
                .map(({ name }) => name);
            let unresovedTemplates: Array<PromptTemplateJson> = [...pipeline.promptTemplates];
            //            <- TODO: [🧠][🥜]
            let resolving: Array<Promise<void>> = [];

            let loopLimit = LOOP_LIMIT;
            while (unresovedTemplates.length > 0) {
                if (loopLimit-- < 0) {
                    // Note: Really UnexpectedError not LimitReachedError - this should be catched during validatePipeline
                    throw new UnexpectedError('Loop limit reached during resolving parameters pipeline execution');
                }

                const currentTemplate = unresovedTemplates.find((template) =>
                    template.dependentParameterNames.every((name) => resovedParameters.includes(name)),
                );

                if (!currentTemplate && resolving.length === 0) {
                    throw new UnexpectedError(
                        // TODO: [🐎] DRY
                        spaceTrim(
                            (block) => `
                                Can not resolve some parameters:

                                Can not resolve:
                                ${block(
                                    unresovedTemplates
                                        .map(
                                            ({ resultingParameterName, dependentParameterNames }) =>
                                                `- Parameter {${resultingParameterName}} which depends on ${dependentParameterNames
                                                    .map((dependentParameterName) => `{${dependentParameterName}}`)
                                                    .join(' and ')}`,
                                        )
                                        .join('\n'),
                                )}

                                Resolved:
                                ${block(resovedParameters.map((name) => `- Parameter {${name}}`).join('\n'))}

                                Note: This should be catched in \`validatePipeline\`
                            `,
                        ),
                    );
                } else if (!currentTemplate) {
                    /* [5] */ await Promise.race(resolving);
                } else {
                    unresovedTemplates = unresovedTemplates.filter((template) => template !== currentTemplate);

                    const work = /* [5] not await */ executeSingleTemplate(currentTemplate)
                        .then(() => {
                            resovedParameters = [...resovedParameters, currentTemplate.resultingParameterName];
                        })
                        .then(() => {
                            resolving = resolving.filter((w) => w !== work);
                        });

                    resolving.push(work);
                }
            }

            await Promise.all(resolving);
        } catch (error) {
            if (!(error instanceof Error)) {
                throw error;
            }

            // Note: No need to rethrow UnexpectedError
            // if (error instanceof UnexpectedError) {

            // Note: Count usage, [🧠] Maybe put to separate function executionReportJsonToUsage + DRY [5]
            const usage = addUsage(
                ...executionReport.promptExecutions.map(({ result }) => result?.usage || ZERO_USAGE),
            );

            // Note: Making this on separate than return to grab errors [4]
            const outputParameters = filterJustOutputParameters();

            return deepFreezeWithSameType({
                isSuccessful: false,
                errors: [error, ...errors],
                usage,
                executionReport,
                outputParameters,
            });
        }

        // Note: Count usage, [🧠] Maybe put to separate function executionReportJsonToUsage + DRY [5]
        const usage = addUsage(...executionReport.promptExecutions.map(({ result }) => result?.usage || ZERO_USAGE));

        // Note: Making this on separate than return to grab errors [4]
        const outputParameters = filterJustOutputParameters();

        return deepFreezeWithSameType({
            isSuccessful: true,
            errors,
            usage,
            executionReport,
            outputParameters,
        });
    };

    return pipelineExecutor;
}

/**
 * TODO: Use isVerbose here (not only pass to `preparePipeline`)
 * TODO: [🪂] Use maxParallelCount here (not only pass to `preparePipeline`)
 * TODO: [♈] Probbably move expectations from templates to parameters
 * TODO: [🧠] When not meet expectations in PROMPT_DIALOG, make some way to tell the user
 * TODO: [👧] Strongly type the executors to avoid need of remove nullables whtn noUncheckedIndexedAccess in tsconfig.json
 * Note: CreatePipelineExecutorOptions are just connected to PipelineExecutor so do not extract to types folder
 * TODO: [🧠][3] transparent = (report intermediate parameters) / opaque execution = (report only output parameters) progress reporting mode
 * TODO: [🛠] Actions, instruments (and maybe knowledge) => Functions and tools
 * TODO: [💷] !!!! `assertsExecutionSuccessful` should be the method of `PipelineExecutor` result
 */
