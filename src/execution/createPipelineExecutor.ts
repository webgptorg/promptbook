import { spaceTrim } from 'spacetrim';
import type { Promisable } from 'type-fest';
import { LOOP_LIMIT } from '../config';
import { validatePipeline } from '../conversion/validation/validatePipeline';
import { ExpectError } from '../errors/_ExpectError';
import { PipelineExecutionError } from '../errors/PipelineExecutionError';
import { UnexpectedError } from '../errors/UnexpectedError';
import { isValidJsonString } from '../formats/json/utils/isValidJsonString';
import { joinLlmExecutionTools } from '../llm-providers/multiple/joinLlmExecutionTools';
import type { ExecutionReportJson } from '../types/execution-report/ExecutionReportJson';
import type { PipelineJson } from '../types/PipelineJson/PipelineJson';
import type { PromptTemplateJson } from '../types/PipelineJson/PromptTemplateJson';
import type { Prompt } from '../types/Prompt';
import type { TaskProgress } from '../types/TaskProgress';
import type { string_name } from '../types/typeAliases';
import type { string_parameter_name } from '../types/typeAliases';
import type { string_parameter_value } from '../types/typeAliases';
import { arrayableToArray } from '../utils/arrayableToArray';
import type { TODO } from '../utils/organization/TODO';
import { PROMPTBOOK_VERSION } from '../version';
import type { ExecutionTools } from './ExecutionTools';
import type { PipelineExecutor } from './PipelineExecutor';
import type { PromptChatResult } from './PromptResult';
import type { PromptCompletionResult } from './PromptResult';
import type { PromptEmbeddingResult } from './PromptResult';
import type { PromptResult } from './PromptResult';
import { addUsage } from './utils/addUsage';
import { checkExpectations } from './utils/checkExpectations';
import { replaceParameters } from './utils/replaceParameters';

type CreatePipelineExecutorSettings = {
    /**
     * When executor does not satisfy expectations it will be retried this amount of times
     *
     * @default 3
     */
    readonly maxExecutionAttempts: number;
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
    const { pipeline, tools, settings = {} } = options;
    const { maxExecutionAttempts = 3 } = settings;

    validatePipeline(pipeline);

    const llmTools = joinLlmExecutionTools(...arrayableToArray(tools.llm));

    const pipelineExecutor: PipelineExecutor = async (
        inputParameters: Record<string_parameter_name, string_parameter_value>,
        onProgress?: (taskProgress: TaskProgress) => Promisable<void>,
    ) => {
        // TODO: !!!!! preparePipeline(); and warn if something is not prepared

        let parametersToPass: Record<string_parameter_name, string_parameter_value> = inputParameters;
        const executionReport: ExecutionReportJson = {
            pipelineUrl: pipeline.pipelineUrl,
            title: pipeline.title,
            promptbookUsedVersion: PROMPTBOOK_VERSION,
            promptbookRequestedVersion: pipeline.promptbookVersion,
            description: pipeline.description,
            promptExecutions: [],
        };

        async function executeSingleTemplate(currentTemplate: PromptTemplateJson) {
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

            let prompt: Prompt;
            let chatResult: PromptChatResult;
            let completionResult: PromptCompletionResult;
            let embeddingResult: PromptEmbeddingResult;
            // Note: [🤖]
            let result: PromptResult | null = null;
            let resultString: string | null = null;
            let expectError: ExpectError | null = null;
            let scriptPipelineExecutionErrors: Array<Error>;
            const maxAttempts = currentTemplate.blockType === 'PROMPT_DIALOG' ? Infinity : maxExecutionAttempts;
            const jokers = currentTemplate.jokers || [];

            attempts: for (let attempt = -jokers.length; attempt < maxAttempts; attempt++) {
                const isJokerAttempt = attempt < 0;
                const joker = jokers[jokers.length + attempt];

                if (isJokerAttempt && !joker) {
                    throw new UnexpectedError(`Joker not found in attempt ${attempt}`);
                }

                result = null;
                resultString = null;
                expectError = null;

                if (isJokerAttempt) {
                    if (typeof parametersToPass[joker!] === 'undefined') {
                        throw new PipelineExecutionError(`Joker parameter {${joker}} not defined`);
                    }

                    resultString = parametersToPass[joker!]!;
                }

                try {
                    if (!isJokerAttempt) {
                        blockType: switch (currentTemplate.blockType) {
                            case 'SIMPLE_TEMPLATE':
                                resultString = replaceParameters(currentTemplate.content, parametersToPass);
                                break blockType;

                            case 'PROMPT_TEMPLATE':
                                prompt = {
                                    title: currentTemplate.title,
                                    pipelineUrl: `${
                                        pipeline.pipelineUrl
                                            ? pipeline.pipelineUrl
                                            : 'anonymous' /* <- TODO: [🧠] How to deal with anonymous pipelines, do here some auto-url like SHA-256 based ad-hoc identifier? */
                                    }#${currentTemplate.name}`,
                                    parameters: parametersToPass,
                                    content: replaceParameters(currentTemplate.content, parametersToPass) /* <- [2] */,
                                    // <- TODO: !!!!! Apply {context} and knowledges
                                    // <- TODO: !!!!! Apply samples
                                    modelRequirements: currentTemplate.modelRequirements!,
                                    // <- TODO: !!!!! Apply persona
                                    expectations: currentTemplate.expectations,
                                    expectFormat: currentTemplate.expectFormat,
                                    postprocessing: (currentTemplate.postprocessing || []).map(
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
                                                            // Note: No ...parametersToPass, because working with result only
                                                        },
                                                    });
                                                } catch (error) {
                                                    if (!(error instanceof Error)) {
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
                                };

                                variant: switch (currentTemplate.modelRequirements!.modelVariant) {
                                    case 'CHAT':
                                        chatResult = await llmTools.callChatModel(prompt);
                                        // TODO: [🍬] Destroy chatThread
                                        result = chatResult;
                                        resultString = chatResult.content;
                                        break variant;
                                    case 'COMPLETION':
                                        completionResult = await llmTools.callCompletionModel(prompt);
                                        result = completionResult;
                                        resultString = completionResult.content;
                                        break variant;

                                    case 'EMBEDDING':
                                        embeddingResult = await llmTools.callEmbeddingModel(prompt);
                                        result = embeddingResult;
                                        resultString = embeddingResult.content.join(',');
                                        break variant;

                                    // <- case [🤖]:

                                    default:
                                        throw new PipelineExecutionError(
                                            `Unknown model variant "${
                                                currentTemplate.modelRequirements!.modelVariant
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
                                        resultString = await scriptTools.execute({
                                            scriptLanguage: currentTemplate.contentLanguage,
                                            script: currentTemplate.content,
                                            parameters: parametersToPass,
                                        });

                                        break scripts;
                                    } catch (error) {
                                        if (!(error instanceof Error)) {
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
                                resultString = await tools.userInterface.promptDialog({
                                    promptTitle: currentTemplate.title,
                                    promptMessage: replaceParameters(
                                        currentTemplate.description || '',
                                        parametersToPass,
                                    ),
                                    defaultValue: replaceParameters(currentTemplate.content, parametersToPass),

                                    // TODO: [🧠] !! Figure out how to define placeholder in .ptbk.md file
                                    placeholder: undefined,
                                    priority,
                                });
                                break blockType;

                            // <- case: [🩻]

                            default:
                                throw new PipelineExecutionError(
                                    `Unknown execution type "${(currentTemplate as TODO).blockType}"`,
                                );
                        }
                    }

                    if (!isJokerAttempt && currentTemplate.postprocessing) {
                        for (const functionName of currentTemplate.postprocessing) {
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
                                            // Note: No ...parametersToPass, because working with result only
                                        },
                                    });

                                    postprocessingError = null;
                                    break scripts;
                                } catch (error) {
                                    if (!(error instanceof Error)) {
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

            parametersToPass = {
                ...parametersToPass,
                [currentTemplate.resultingParameterName]:
                    resultString /* <- Note: Not need to detect parameter collision here because pipeline checks logic consistency during construction */,
            };
        }

        try {
            let resovedParameters: Array<string_name> = pipeline.parameters
                .filter(({ isInput }) => isInput)
                .map(({ name }) => name);
            let unresovedTemplates: Array<PromptTemplateJson> = [...pipeline.promptTemplates];
            let resolving: Array<Promise<void>> = [];

            let loopLimit = LOOP_LIMIT;
            while (unresovedTemplates.length > 0) {
                if (loopLimit-- < 0) {
                    throw new UnexpectedError('Loop limit reached during resolving parameters pipeline execution');
                }

                const currentTemplate = unresovedTemplates.find((template) =>
                    template.dependentParameterNames.every((name) => resovedParameters.includes(name)),
                );

                if (!currentTemplate && resolving.length === 0) {
                    throw new UnexpectedError(
                        spaceTrim(`
                            Can not resolve some parameters

                            Note: This should be catched during validatePipeline
                        `),
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

            // Note: Count usage, [🧠] Maybe put to separate function executionReportJsonToUsage + DRY [5]
            const usage = addUsage(
                ...executionReport.promptExecutions.map(({ result }) => result?.usage || addUsage()),
            );

            return {
                isSuccessful: false,
                errors: [error],
                usage,
                executionReport,
                outputParameters: parametersToPass,
            };
        }

        // Note: Filter ONLY output parameters
        for (const parameter of pipeline.parameters) {
            if (parameter.isOutput) {
                continue;
            }

            delete parametersToPass[parameter.name];
        }

        // Note: Count usage, [🧠] Maybe put to separate function executionReportJsonToUsage + DRY [5]
        const usage = addUsage(...executionReport.promptExecutions.map(({ result }) => result?.usage || addUsage()));

        return {
            isSuccessful: true,
            errors: [],
            usage,
            executionReport,
            outputParameters: parametersToPass,
        };
    };

    return pipelineExecutor;
}

/**
 * TODO: [🪂] Pass maxParallelCount here
 * TODO: [♈] Probbably move expectations from templates to parameters
 * TODO: [🧠] When not meet expectations in PROMPT_DIALOG, make some way to tell the user
 * TODO: [👧] Strongly type the executors to avoid need of remove nullables whtn noUncheckedIndexedAccess in tsconfig.json
 * Note: CreatePipelineExecutorOptions are just connected to PipelineExecutor so do not extract to types folder
 * TODO: [🧠][3] transparent = (report intermediate parameters) / opaque execution = (report only output parameters) progress reporting mode
 * TODO: [🛠] Actions, instruments (and maybe knowledge) => Functions and tools
 */
