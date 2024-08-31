import { spaceTrim } from 'spacetrim';
import type { Promisable } from 'type-fest';
import { forTime } from 'waitasecond';
import {
    IMMEDIATE_TIME,
    IS_VERBOSE,
    LOOP_LIMIT,
    MAX_EXECUTION_ATTEMPTS,
    MAX_PARALLEL_COUNT,
    RESERVED_PARAMETER_MISSING_VALUE,
    RESERVED_PARAMETER_NAMES,
    RESERVED_PARAMETER_RESTRICTED,
} from '../config';
import { extractParameterNamesFromTemplate } from '../conversion/utils/extractParameterNamesFromTemplate';
import { validatePipeline } from '../conversion/validation/validatePipeline';
import { ExpectError } from '../errors/ExpectError';
import { PipelineExecutionError } from '../errors/PipelineExecutionError';
import { UnexpectedError } from '../errors/UnexpectedError';
import { serializeError } from '../errors/utils/serializeError';
import { isValidJsonString } from '../formats/json/utils/isValidJsonString';
import { joinLlmExecutionTools } from '../llm-providers/multiple/joinLlmExecutionTools';
import { extractJsonBlock } from '../postprocessing/utils/extractJsonBlock';
import { isPipelinePrepared } from '../prepare/isPipelinePrepared';
import { preparePipeline } from '../prepare/preparePipeline';
import type { ExecutionReportJson } from '../types/execution-report/ExecutionReportJson';
import type { ModelRequirements } from '../types/ModelRequirements';
import type { PipelineJson } from '../types/PipelineJson/PipelineJson';
import type { TemplateJson } from '../types/PipelineJson/TemplateJson';
import type { ChatPrompt, CompletionPrompt, EmbeddingPrompt, Prompt } from '../types/Prompt';
import type { TaskProgress } from '../types/TaskProgress';
import type {
    Parameters,
    ReservedParameters,
    string_markdown,
    string_name,
    string_parameter_value,
} from '../types/typeAliases';
import { arrayableToArray } from '../utils/arrayableToArray';
import { keepUnused } from '../utils/organization/keepUnused';
import type { really_any } from '../utils/organization/really_any';
import type { TODO_any } from '../utils/organization/TODO_any';
import { TODO_USE } from '../utils/organization/TODO_USE';
import { replaceParameters } from '../utils/replaceParameters';
import { $asDeeplyFrozenSerializableJson } from '../utils/serialization/$asDeeplyFrozenSerializableJson';
import { $deepFreeze } from '../utils/serialization/$deepFreeze';
import { difference } from '../utils/sets/difference';
import { union } from '../utils/sets/union';
import { PROMPTBOOK_VERSION } from '../version';
import type { ExecutionTools } from './ExecutionTools';
import type { PipelineExecutor } from './PipelineExecutor';
import type { PipelineExecutorResult } from './PipelineExecutorResult';
import type { ChatPromptResult, CompletionPromptResult, EmbeddingPromptResult, PromptResult } from './PromptResult';
import { addUsage, ZERO_USAGE } from './utils/addUsage';
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

    /**
     * If you pass fully prepared pipeline, this does not matter
     *
     * Otherwise:
     * If false or not set, warning is shown when pipeline is not prepared
     * If true, warning is suppressed
     *
     * @default false
     */
    readonly isNotPreparedWarningSupressed?: boolean;
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
 * @public exported from `@promptbook/core`
 */
export function createPipelineExecutor(options: CreatePipelineExecutorOptions): PipelineExecutor {
    const { pipeline, tools, settings = {} } = options;
    const {
        maxExecutionAttempts = MAX_EXECUTION_ATTEMPTS,
        maxParallelCount = MAX_PARALLEL_COUNT,
        isVerbose = IS_VERBOSE,
        isNotPreparedWarningSupressed = false,
    } = settings;

    validatePipeline(pipeline);

    const pipelineIdentification = (() => {
        // Note: This is a 😐 implementation of [🚞]
        const _: Array<string> = [];

        if (pipeline.sourceFile !== undefined) {
            _.push(`File: ${pipeline.sourceFile}`);
        }

        if (pipeline.pipelineUrl !== undefined) {
            _.push(`Url: ${pipeline.pipelineUrl}`);
        }

        return _.join('\n');
    })();

    const llmTools = joinLlmExecutionTools(...arrayableToArray(tools.llm));

    let preparedPipeline: PipelineJson;

    if (isPipelinePrepared(pipeline)) {
        preparedPipeline = pipeline;
    } else if (isNotPreparedWarningSupressed !== true) {
        console.warn(
            spaceTrim(
                (block) => `
                    Pipeline is not prepared

                    ${block(pipelineIdentification)}

                    It will be prepared ad-hoc before the first execution and **returned as \`preparedPipeline\` in \`PipelineExecutorResult\`**
                    But it is recommended to prepare the pipeline during collection preparation

                    @see more at https://ptbk.io/prepare-pipeline
                `,
            ),
        );
    }

    const pipelineExecutor: PipelineExecutor = async (
        inputParameters: Parameters,
        onProgress?: (taskProgress: TaskProgress) => Promisable<void>,
    ): Promise<PipelineExecutorResult> => {
        if (preparedPipeline === undefined) {
            preparedPipeline = await preparePipeline(pipeline, {
                llmTools,
                isVerbose,
                maxParallelCount,
            });
        }

        const errors: Array<PipelineExecutionError> = [];
        const warnings: Array<PipelineExecutionError /* <- [🧠][⚠] What is propper object type to handle warnings */> =
            [];

        const executionReport: ExecutionReportJson = {
            pipelineUrl: preparedPipeline.pipelineUrl,
            title: preparedPipeline.title,
            promptbookUsedVersion: PROMPTBOOK_VERSION,
            promptbookRequestedVersion: preparedPipeline.promptbookVersion,
            description: preparedPipeline.description,
            promptExecutions: [],
        };

        /**
         * Note: This is a flag to prevent `onProgress` call after the pipeline execution is finished
         */
        let isReturned = false;

        // Note: Check that all input input parameters are defined
        for (const parameter of preparedPipeline.parameters.filter(({ isInput }) => isInput)) {
            if (inputParameters[parameter.name] === undefined) {
                isReturned = true;

                if (onProgress !== undefined) {
                    // Note: Wait a short time to prevent race conditions
                    await forTime(IMMEDIATE_TIME);
                }

                return $asDeeplyFrozenSerializableJson(
                    `Unuccessful PipelineExecutorResult (with missing parameter {${parameter.name}}) PipelineExecutorResult`,
                    {
                        isSuccessful: false,
                        errors: [
                            new PipelineExecutionError(
                                `Parameter {${parameter.name}} is required as an input parameter`,
                            ),
                            ...errors,
                        ].map(serializeError),
                        warnings: [],
                        executionReport,
                        outputParameters: {},
                        usage: ZERO_USAGE,
                        preparedPipeline,
                    },
                ) satisfies PipelineExecutorResult;
            }
        }

        // Note: Check that no extra input parameters are passed
        for (const parameterName of Object.keys(inputParameters)) {
            const parameter = preparedPipeline.parameters.find(({ name }) => name === parameterName);

            if (parameter === undefined) {
                warnings.push(
                    new PipelineExecutionError(
                        spaceTrim(
                            (block) => `
                                Extra parameter {${parameterName}} is being passed which is not part of the pipeline.

                                ${block(pipelineIdentification)}
                            `,
                        ),
                    ),
                );
            } else if (parameter.isInput === false) {
                isReturned = true;

                if (onProgress !== undefined) {
                    // Note: Wait a short time to prevent race conditions
                    await forTime(IMMEDIATE_TIME);
                }

                // TODO: [🧠] This should be also non-critical error
                return $asDeeplyFrozenSerializableJson(
                    spaceTrim(
                        (block) => `
                            Unuccessful PipelineExecutorResult (with extra parameter {${
                                parameter.name
                            }}) PipelineExecutorResult

                            ${block(pipelineIdentification)}
                        `,
                    ),
                    {
                        isSuccessful: false,
                        errors: [
                            new PipelineExecutionError(
                                spaceTrim(
                                    (block) => `
                                        Parameter {${parameter.name}} is passed as input parameter but it is not input

                                        ${block(pipelineIdentification)}
                                    `,
                                ),
                            ),
                            ...errors,
                        ].map(serializeError),
                        warnings: warnings.map(serializeError),
                        executionReport,
                        outputParameters: {},
                        usage: ZERO_USAGE,
                        preparedPipeline,
                    },
                ) satisfies PipelineExecutorResult;
            }
        }

        let parametersToPass: Parameters = inputParameters;

        // TODO: !!! Extract to separate functions and files - ALL FUNCTIONS BELOW

        async function getContextForTemplate(
            template: TemplateJson,
        ): Promise<string_parameter_value & string_markdown> {
            TODO_USE(template);
            return RESERVED_PARAMETER_MISSING_VALUE /* <- TODO: [🏍] Implement */;
        }

        async function getKnowledgeForTemplate(
            template: TemplateJson,
        ): Promise<string_parameter_value & string_markdown> {
            // TODO: [♨] Implement Better - use real index and keyword search from `template` and {samples}

            TODO_USE(template);
            return preparedPipeline.knowledgePieces.map(({ content }) => `- ${content}`).join('\n');
            //                                                      <- TODO: [🧠] Some smart aggregation of knowledge pieces, single-line vs multi-line vs mixed
        }

        async function getSamplesForTemplate(
            template: TemplateJson,
        ): Promise<string_parameter_value & string_markdown> {
            // TODO: [♨] Implement Better - use real index and keyword search

            TODO_USE(template);
            return RESERVED_PARAMETER_MISSING_VALUE /* <- TODO: [♨] Implement */;
        }

        async function getReservedParametersForTemplate(template: TemplateJson): Promise<ReservedParameters> {
            const context = await getContextForTemplate(template); // <- [🏍]
            const knowledge = await getKnowledgeForTemplate(template);
            const samples = await getSamplesForTemplate(template);
            const currentDate = new Date().toISOString(); // <- TODO: [🧠] Better
            const modelName = RESERVED_PARAMETER_MISSING_VALUE;

            const reservedParameters: ReservedParameters = {
                content: RESERVED_PARAMETER_RESTRICTED,
                context, // <- [🏍]
                knowledge,
                samples,
                currentDate,
                modelName,
            };

            // Note: Doublecheck that ALL reserved parameters are defined:
            for (const parameterName of RESERVED_PARAMETER_NAMES) {
                if (reservedParameters[parameterName] === undefined) {
                    throw new UnexpectedError(
                        spaceTrim(
                            (block) => `
                                Reserved parameter {${parameterName}} is not defined

                                ${block(pipelineIdentification)}
                            `,
                        ),
                    );
                }
            }

            return reservedParameters;
        }

        async function executeSingleTemplate(currentTemplate: TemplateJson) {
            const name = `pipeline-executor-frame-${currentTemplate.name}`;
            const title = currentTemplate.title;
            const priority = preparedPipeline.templates.length - preparedPipeline.templates.indexOf(currentTemplate);

            if (onProgress !== undefined /* <- [3] */) {
                const progress: TaskProgress = {
                    name,
                    title,
                    isStarted: false,
                    isDone: false,
                    blockType: currentTemplate.blockType,
                    parameterName: currentTemplate.resultingParameterName,
                    parameterValue: null,
                    // <- [3]
                };

                if (isReturned) {
                    throw new UnexpectedError(
                        spaceTrim(
                            (block) => `
                                Can not call \`onProgress\` after pipeline execution is finished 🍏

                                ${block(pipelineIdentification)}

                                ${block(
                                    JSON.stringify(progress, null, 4)
                                        .split('\n')
                                        .map((line) => `> ${line}`)
                                        .join('\n'),
                                )}
                            `,
                        ),
                    );
                }

                await onProgress(progress);
            }

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
            const maxAttempts = currentTemplate.blockType === 'DIALOG_TEMPLATE' ? Infinity : maxExecutionAttempts;
            const jokerParameterNames = currentTemplate.jokerParameterNames || [];

            const preparedContent = (currentTemplate.preparedContent || '{content}')
                .split('{content}')
                .join(currentTemplate.content);
            //    <- TODO: [🍵] Use here `replaceParameters` to replace {websiteContent} with option to ignore missing parameters

            attempts: for (let attempt = -jokerParameterNames.length; attempt < maxAttempts; attempt++) {
                const isJokerAttempt = attempt < 0;
                const jokerParameterName = jokerParameterNames[jokerParameterNames.length + attempt];

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
                        blockType: switch (currentTemplate.blockType) {
                            case 'SIMPLE_TEMPLATE':
                                resultString = replaceParameters(preparedContent, parameters);
                                break blockType;

                            case 'PROMPT_TEMPLATE':
                                {
                                    const modelRequirements = {
                                        modelVariant: 'CHAT',
                                        ...(pipeline.defaultModelRequirements || {}),
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
                                            chatResult = await llmTools.callChatModel(
                                                $deepFreeze(prompt) as ChatPrompt,
                                            );
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
                                                            (currentTemplate as really_any).modelRequirements
                                                                .modelVariant
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
                                                Script language is not defined for SCRIPT TEMPLATE "${
                                                    currentTemplate.name
                                                }"

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
                                    break blockType;
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

                                // Note: This line is unreachable because of the break blockType above
                                break blockType;

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

                                // TODO: [🌹] When making next attempt for `DIALOG BLOCK`, preserve the previous user input
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
                                break blockType;

                            // <- case: [🅱]

                            default:
                                throw new PipelineExecutionError(
                                    spaceTrim(
                                        (block) => `
                                            Unknown execution type "${(currentTemplate as TODO_any).blockType}"

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
                        currentTemplate.blockType === 'PROMPT_TEMPLATE' &&
                        prompt!
                        //    <- Note:  [2] When some expected parameter is not defined, error will occur in replaceParameters
                        //              In that case we don’t want to make a report about it because it’s not a llm execution error
                    ) {
                        // TODO: [🧠] Maybe put other blockTypes into report
                        executionReport.promptExecutions.push({
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

            if (onProgress !== undefined /* <- [3] */) {
                const progress: TaskProgress = {
                    name,
                    title,
                    isStarted: true,
                    isDone: true,
                    blockType: currentTemplate.blockType,
                    parameterName: currentTemplate.resultingParameterName,
                    parameterValue: resultString,
                    // <- [3]
                };

                if (isReturned) {
                    throw new UnexpectedError(
                        spaceTrim(
                            (block) => `
                                Can not call \`onProgress\` after pipeline execution is finished 🍎

                                ${block(pipelineIdentification)}

                                ${block(
                                    JSON.stringify(progress, null, 4)
                                        .split('\n')
                                        .map((line) => `> ${line}`)
                                        .join('\n'),
                                )}

                            `,
                        ),
                    );
                }

                await onProgress(progress);
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
            for (const parameter of preparedPipeline.parameters.filter(({ isOutput }) => isOutput)) {
                if (parametersToPass[parameter.name] === undefined) {
                    // [4]
                    warnings.push(
                        new PipelineExecutionError(
                            spaceTrim(
                                (block) => `
                                    Parameter {${
                                        parameter.name
                                    }} should be an output parameter, but it was not generated during pipeline execution

                                    ${block(pipelineIdentification)}
                                `,
                            ),
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
            let resovedParameterNames: Array<string_name> = preparedPipeline.parameters
                .filter(({ isInput }) => isInput)
                .map(({ name }) => name);
            let unresovedTemplates: Array<TemplateJson> = [...preparedPipeline.templates];
            let resolving: Array<Promise<void>> = [];

            let loopLimit = LOOP_LIMIT;
            while (unresovedTemplates.length > 0) {
                if (loopLimit-- < 0) {
                    // Note: Really UnexpectedError not LimitReachedError - this should be catched during validatePipeline
                    throw new UnexpectedError(
                        spaceTrim(
                            (block) => `
                                Loop limit reached during resolving parameters pipeline execution

                                ${block(pipelineIdentification)}
                            `,
                        ),
                    );
                }

                const currentTemplate = unresovedTemplates.find((template) =>
                    template.dependentParameterNames.every((name) =>
                        [...resovedParameterNames, ...RESERVED_PARAMETER_NAMES].includes(name),
                    ),
                );

                if (!currentTemplate && resolving.length === 0) {
                    throw new UnexpectedError(
                        // TODO: [🐎] DRY
                        spaceTrim(
                            (block) => `
                                Can not resolve some parameters:

                                ${block(pipelineIdentification)}

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
                                ${block(resovedParameterNames.map((name) => `- Parameter {${name}}`).join('\n'))}

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
                            resovedParameterNames = [...resovedParameterNames, currentTemplate.resultingParameterName];
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

            // Note: Making this on separate line before `return` to grab errors [4]
            const outputParameters = filterJustOutputParameters();

            isReturned = true;

            if (onProgress !== undefined) {
                // Note: Wait a short time to prevent race conditions
                await forTime(IMMEDIATE_TIME);
            }

            return $asDeeplyFrozenSerializableJson(
                'Unuccessful PipelineExecutorResult (with misc errors) PipelineExecutorResult',
                {
                    isSuccessful: false,
                    errors: [error, ...errors].map(serializeError),
                    warnings: warnings.map(serializeError),
                    usage,
                    executionReport,
                    outputParameters,
                    preparedPipeline,
                },
            ) satisfies PipelineExecutorResult;
        }

        // Note: Count usage, [🧠] Maybe put to separate function executionReportJsonToUsage + DRY [5]
        const usage = addUsage(...executionReport.promptExecutions.map(({ result }) => result?.usage || ZERO_USAGE));

        // Note:  Making this on separate line before `return` to grab errors [4]
        const outputParameters = filterJustOutputParameters();

        isReturned = true;

        if (onProgress !== undefined) {
            // Note: Wait a short time to prevent race conditions
            await forTime(IMMEDIATE_TIME);
        }

        return $asDeeplyFrozenSerializableJson('Successful PipelineExecutorResult', {
            isSuccessful: true,
            errors: errors.map(serializeError),
            warnings: warnings.map(serializeError),
            usage,
            executionReport,
            outputParameters,
            preparedPipeline,
        }) satisfies PipelineExecutorResult;
    };

    return pipelineExecutor;
}

/**
 * TODO: !!! Identify not only pipeline BUT exact template ${block(pipelineIdentification)}
 * TODO: Use isVerbose here (not only pass to `preparePipeline`)
 * TODO: [🧠][🌳] Use here `countTotalUsage` and put preparation and prepared pipiline to report
 * TODO: [🪂] Use maxParallelCount here (not only pass to `preparePipeline`)
 * TODO: [♈] Probbably move expectations from templates to parameters
 * TODO: [🧠] When not meet expectations in DIALOG_TEMPLATE, make some way to tell the user
 * TODO: [👧] Strongly type the executors to avoid need of remove nullables whtn noUncheckedIndexedAccess in tsconfig.json
 * Note: CreatePipelineExecutorOptions are just connected to PipelineExecutor so do not extract to types folder
 * TODO: [🧠][3] transparent = (report intermediate parameters) / opaque execution = (report only output parameters) progress reporting mode
 * TODO: [🛠] Actions, instruments (and maybe knowledge) => Functions and tools
 * TODO: [🧠][💷] `assertsExecutionSuccessful` should be the method of `PipelineExecutor` result BUT maybe NOT to preserve pure JSON object
 */
