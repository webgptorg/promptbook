import spaceTrim from 'spacetrim';
import type { Promisable } from 'type-fest';
import type { string_name } from '.././types/typeAliases';
import { PromptTemplatePipelineJson } from '../_packages/types.index';
import { validatePromptTemplatePipelineJson } from '../conversion/validatePromptTemplatePipelineJson';
import type { Prompt } from '../types/Prompt';
import type { ExpectationUnit, PromptTemplateJson } from '../types/PromptTemplatePipelineJson/PromptTemplateJson';
import type { TaskProgress } from '../types/TaskProgress';
import type { ExecutionReportJson } from '../types/execution-report/ExecutionReportJson';
import { CountUtils } from '../utils/expectation-counters';
import { isValidJsonString } from '../utils/isValidJsonString';
import { iterateListParameters } from '../utils/iterateListParameters';
import { removeMarkdownFormatting } from '../utils/markdown/removeMarkdownFormatting';
import { removeEmojis } from '../utils/removeEmojis';
import { replaceParameters } from '../utils/replaceParameters';
import { PTBK_VERSION } from '../version';
import { ExecutionTools } from './ExecutionTools';
import { ExpectError } from './ExpectError';
import type { PromptChatResult, PromptCompletionResult, PromptResult } from './PromptResult';
import { PtpExecutor } from './PtpExecutor';

export interface CreatePtpExecutorSettings {
    /**
     * When executor does not satisfy expectations it will be retried this amount of times
     *
     * @default 3
     */
    readonly maxExecutionAttempts: number;
}

/**
 * Options for creating a PTP (Prompt Template Pipeline) executor
 */
interface CreatePtpExecutorOptions {
    /**
     * The Prompt Template Pipeline (PTP) to be executed
     */
    readonly ptp: PromptTemplatePipelineJson; // <- TODO: Probbably rename to ptbk

    /**
     * The execution tools to be used during the execution of the PTP
     */
    readonly tools: ExecutionTools;

    /**
     * Optional settings for the PTP executor
     */
    readonly settings?: Partial<CreatePtpExecutorSettings>;
}

/**
 * Creates executor function from prompt template pipeline and execution tools.
 *
 * Note: Consider using getExecutor method of the library instead of using this function
 */
export function createPtpExecutor(options: CreatePtpExecutorOptions): PtpExecutor {
    const { ptp, tools, settings = {} } = options;
    const { maxExecutionAttempts = 3 } = settings;

    validatePromptTemplatePipelineJson(ptp);

    const ptpExecutor: PtpExecutor = async (
        inputParameters: Record<string_name, string | Array<string>>,
        onProgress?: (taskProgress: TaskProgress) => Promisable<void>,
    ) => {
        let parametersToPass: Record<string_name, string | Array<string>> = inputParameters;
        const executionReport: ExecutionReportJson = {
            ptbkUrl: ptp.ptbkUrl,
            title: ptp.title,
            ptbkUsedVersion: PTBK_VERSION,
            ptbkRequestedVersion: ptp.ptbkVersion,
            description: ptp.description,
            promptExecutions: [],
        };

        /**
         * Executes a single template with all the iterators (or without one if there are no iterators)
         *
         * @sideeffect directly writes to parametersToPass after the result
         */
        async function executeSingleTemplate(currentTemplate: PromptTemplateJson): Promise<void> {
            if (!currentTemplate.iterators) {
                // TODO: [3] DRY
                const templateInputParameters: Record<string_name, string> = {};
                for (const parameterName of currentTemplate.dependentParameterNames) {
                    const parameterValue = parametersToPass[parameterName];
                    if (typeof parameterValue !== 'string') {
                        throw new Error(
                            //         <- TODO: [🥨] Make some NeverShouldHappenError
                            spaceTrim(`
                            Parameter {${parameterName}} is not string but ${typeof parameterValue}

                            - Parameter value is \`${JSON.stringify(parameterValue)}\`
                            - This bug should be handled in \`validatePromptTemplatePipelineJson\`
                            - \`executeSingleTemplate\` should be called only when all dependent parameters are defined
                            - Also it should be propperly iterated

                        `),
                        );
                    }
                    templateInputParameters[parameterName] = parameterValue;
                }
                const resultString = await executeSingleTemplateIteration(currentTemplate, templateInputParameters);
                parametersToPass = {
                    ...parametersToPass,
                    [currentTemplate.resultingParameterName]:
                        resultString /* <- Note: Not need to detect parameter collision here because PromptTemplatePipeline checks logic consistency during construction */,
                };
            } else {
                const indexRangeValues = Object.fromEntries(
                    currentTemplate.iterators.map(({ indexName, parameterName }) => [
                        indexName,
                        parametersToPass[parameterName]!.length,
                    ]),
                );

                const resultListPromise = Array.from(iterateListParameters(indexRangeValues)).map((indexValues) => {
                    // TODO: [3] DRY
                    const templateInputParameters: Record<string_name, string> = {};
                    for (const parameterName of currentTemplate.dependentParameterNames) {
                        let parameterValue = parametersToPass[parameterName];

                        if (Array.isArray(parameterValue)) {
                            const iterator = (currentTemplate.iterators || []).find(
                                (iterator) => iterator.parameterName === parameterName,
                            );

                            if (!iterator) {
                                throw new Error(
                                    //         <- TODO: [🥨] Make some NeverShouldHappenError
                                    spaceTrim(`
                                        Iterator for parameter {${parameterName}} not found

                                        - Parameter value is \`${JSON.stringify(parameterValue)}\`
                                        - Iterators for current template are \`${JSON.stringify(
                                            currentTemplate.iterators,
                                        )}\`
                                        - This bug should be handled in \`validatePromptTemplatePipelineJson\`
                                    `),
                                );
                            }

                            const indexValue = indexValues[iterator.indexName];

                            if (typeof indexValue !== 'number') {
                                throw new Error(`indexValue is not number but ${typeof indexValue}`);
                                //         <- TODO: [🥨] Make some NeverShouldHappenError
                            }

                            parameterValue = parameterValue[indexValue];
                        } /* not else - want to check a second condition */

                        if (typeof parameterValue !== 'string') {
                            throw new Error(
                                //         <- TODO: [🥨] Make some NeverShouldHappenError
                                spaceTrim(`
                                    Parameter {${parameterName}} is not string but ${typeof parameterValue}

                                    - Parameter value is \`${JSON.stringify(parameterValue)}\`
                                    - This bug should be handled in \`validatePromptTemplatePipelineJson\`
                                    - \`executeSingleTemplate\` should be called only when all dependent parameters are defined
                                    - Also it should be propperly iterated

                                `),
                            );
                        }
                        templateInputParameters[parameterName] = parameterValue;
                    }
                    return executeSingleTemplateIteration(currentTemplate, templateInputParameters);
                });

                const resultList = await Promise.all(resultListPromise);

                parametersToPass = {
                    ...parametersToPass,
                    [currentTemplate.resultingParameterName]:
                        resultList /* <- Note: Not need to detect parameter collision here because PromptTemplatePipeline checks logic consistency during construction */,
                };
            }
        }

        /**
         * Executes a single iteration of a template
         *
         * @returns the result of the template execution
         */
        async function executeSingleTemplateIteration(
            currentTemplate: PromptTemplateJson,
            templateInputParameters: Record<string_name, string>,
        ): Promise<string> {
            const name = `ptp-executor-frame-${currentTemplate.name}`;
            const title = removeEmojis(removeMarkdownFormatting(currentTemplate.title));
            const priority = ptp.promptTemplates.length - ptp.promptTemplates.indexOf(currentTemplate); // <- TODO: !!!! Put iteration logic here

            if (onProgress) {
                await onProgress({
                    name,
                    title,
                    isStarted: false,
                    isDone: false,
                    executionType: currentTemplate.executionType,
                    parameterName: currentTemplate.resultingParameterName,
                    parameterValue: null,
                });
            }

            let prompt: Prompt;
            let chatThread: PromptChatResult;
            let completionResult: PromptCompletionResult;
            let result: PromptResult | null = null;
            let resultString: string | null = null;
            let expectError: ExpectError | null = null;
            let scriptExecutionErrors: Array<Error>;
            const maxAttempts = currentTemplate.executionType === 'PROMPT_DIALOG' ? Infinity : maxExecutionAttempts;
            const jokers = currentTemplate.jokers || [];

            attempts: for (let attempt = -jokers.length; attempt < maxAttempts; attempt++) {
                const isJokerAttempt = attempt < 0;
                const joker = jokers[jokers.length + attempt];

                if (isJokerAttempt && !joker) {
                    throw new Error(`Joker not found in attempt ${attempt}`);
                    //              <- TODO: [🥨] Make some NeverShouldHappenError
                }

                result = null;
                resultString = null;
                expectError = null;

                if (isJokerAttempt) {
                    if (typeof parametersToPass[joker!] === 'undefined') {
                        throw new Error(`Joker parameter {${joker}} not defined`);
                    }

                    resultString = templateInputParameters[joker!]!;
                }

                try {
                    if (!isJokerAttempt) {
                        executionType: switch (currentTemplate.executionType) {
                            case 'SIMPLE_TEMPLATE':
                                resultString = replaceParameters(currentTemplate.content, parametersToPass);
                                break executionType;

                            case 'PROMPT_TEMPLATE':
                                prompt = {
                                    title: currentTemplate.title,
                                    ptbkUrl: `${
                                        ptp.ptbkUrl
                                            ? ptp.ptbkUrl
                                            : 'anonymous' /* <- [🧠] !!! How to deal with anonymous PTPs, do here some auto-url like SHA-256 based ad-hoc identifier? */
                                    }#${currentTemplate.name}`,
                                    parameters: templateInputParameters,
                                    content: replaceParameters(currentTemplate.content, parametersToPass) /* <- [2] */,
                                    modelRequirements: currentTemplate.modelRequirements!,
                                };

                                variant: switch (currentTemplate.modelRequirements!.modelVariant) {
                                    case 'CHAT':
                                        chatThread = await tools.natural.gptChat(prompt);
                                        // TODO: [🍬] Destroy chatThread
                                        result = chatThread;
                                        resultString = chatThread.content;
                                        break variant;
                                    case 'COMPLETION':
                                        completionResult = await tools.natural.gptComplete(prompt);
                                        result = completionResult;
                                        resultString = completionResult.content;
                                        break variant;
                                    default:
                                        throw new Error(
                                            `Unknown model variant "${
                                                currentTemplate.modelRequirements!.modelVariant
                                            }"`,
                                        );
                                }

                                break;

                            case 'SCRIPT':
                                if (tools.script.length === 0) {
                                    throw new Error('No script execution tools are available');
                                }
                                if (!currentTemplate.contentLanguage) {
                                    throw new Error(
                                        `Script language is not defined for prompt template "${currentTemplate.name}"`,
                                    );
                                }

                                // TODO: DRY [1]

                                scriptExecutionErrors = [];

                                scripts: for (const scriptTools of tools.script) {
                                    try {
                                        resultString = await scriptTools.execute({
                                            scriptLanguage: currentTemplate.contentLanguage,
                                            script: currentTemplate.content,
                                            parameters: templateInputParameters,
                                        });

                                        break scripts;
                                    } catch (error) {
                                        if (!(error instanceof Error)) {
                                            throw error;
                                        }

                                        scriptExecutionErrors.push(error);
                                    }
                                }

                                if (resultString) {
                                    break executionType;
                                }

                                if (scriptExecutionErrors.length === 1) {
                                    throw scriptExecutionErrors[0];
                                } else {
                                    throw new Error(
                                        spaceTrim(
                                            (block) => `
                                              Script execution failed ${scriptExecutionErrors.length} times

                                              ${block(
                                                  scriptExecutionErrors
                                                      .map((error) => '- ' + error.message)
                                                      .join('\n\n'),
                                              )}
                                          `,
                                        ),
                                    );
                                }

                                // Note: This line is unreachable because of the break executionType above
                                break executionType;

                            case 'PROMPT_DIALOG':
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
                                break executionType;

                            default:
                                throw new Error(
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    `Unknown execution type "${(currentTemplate as any).executionType}"`,
                                );
                        }
                    }

                    if (!isJokerAttempt && currentTemplate.postprocessing) {
                        for (const functionName of currentTemplate.postprocessing) {
                            // TODO: DRY [1]
                            scriptExecutionErrors = [];
                            let postprocessingError = null;

                            scripts: for (const scriptTools of tools.script) {
                                try {
                                    resultString = await scriptTools.execute({
                                        scriptLanguage: `javascript` /* <- TODO: Try it in each languages; In future allow postprocessing with arbitrary combination of languages to combine */,
                                        script: `${functionName}(resultString)`,
                                        parameters: { ...parametersToPass, resultString: resultString || '' },
                                    });

                                    postprocessingError = null;
                                    break scripts;
                                } catch (error) {
                                    if (!(error instanceof Error)) {
                                        throw error;
                                    }

                                    postprocessingError = error;
                                    scriptExecutionErrors.push(error);
                                }
                            }

                            if (postprocessingError) {
                                throw postprocessingError;
                            }
                        }
                    }

                    if (currentTemplate.expectFormat) {
                        if (currentTemplate.expectFormat === 'JSON') {
                            if (!isValidJsonString(resultString || '')) {
                                throw new ExpectError('Expected valid JSON string');
                            }
                        } else {
                            // TODO: Here should be fatal errror which breaks through the retry loop
                        }
                    }

                    if (currentTemplate.expectAmount) {
                        for (const [unit, { max, min }] of Object.entries(currentTemplate.expectAmount)) {
                            const amount = CountUtils[unit.toUpperCase() as ExpectationUnit](resultString || '');

                            if (min && amount < min) {
                                throw new ExpectError(`Expected at least ${min} ${unit} but got ${amount}`);
                            } /* not else */

                            if (max && amount > max) {
                                throw new ExpectError(`Expected at most ${max} ${unit} but got ${amount}`);
                            }
                        }
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
                        currentTemplate.executionType === 'PROMPT_TEMPLATE' &&
                        prompt!
                        //    <- Note:  [2] When some expected parameter is not defined, error will occur in replaceParameters
                        //              In that case we don’t want to make a report about it because it’s not a natural execution error
                    ) {
                        // TODO: [🧠] Maybe put other executionTypes into report
                        executionReport.promptExecutions.push({
                            prompt: {
                                title: currentTemplate.title /* <- Note: If title in promptbook contains emojis, pass it innto report */,
                                content: prompt.content,
                                modelRequirements: prompt.modelRequirements,
                                // <- Note: Do want to pass ONLY wanted information to the report
                            },
                            result: result || undefined,
                            error: expectError || undefined,
                        });
                    }
                }

                if (expectError !== null && attempt === maxAttempts - 1) {
                    throw new Error(
                        spaceTrim(
                            (block) => `
                              Natural execution failed ${settings.maxExecutionAttempts}x

                              ${block(expectError?.message || '')}
                          `,
                        ),
                    );
                }
            }

            if (resultString === null) {
                //              <- TODO: [🥨] Make some NeverShouldHappenError
                throw new Error('Something went wrong and prompt result is null');
            }

            if (onProgress) {
                onProgress({
                    name,
                    title,
                    isStarted: true,
                    isDone: true,
                    executionType: currentTemplate.executionType,
                    parameterName: currentTemplate.resultingParameterName,
                    parameterValue: resultString,
                });
            }

            return resultString;
        }

        try {
            let resovedParameters: Array<string_name> = ptp.parameters
                .filter(({ isInput }) => isInput)
                .map(({ name }) => name);
            let unresovedTemplates: Array<PromptTemplateJson> = [...ptp.promptTemplates];
            let resolving: Array<Promise<void>> = [];

            while (unresovedTemplates.length > 0) {
                const currentTemplate = unresovedTemplates.find((template) =>
                    template.dependentParameterNames.every((name) => resovedParameters.includes(name)),
                );

                if (!currentTemplate && resolving.length === 0) {
                    throw new Error(`Can not resolve some parameters`);
                    //              <- TODO: [🥨] Make some NeverShouldHappenError, should be catched during validatePromptTemplatePipelineJson
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

            return {
                isSuccessful: false,
                errors: [error],
                executionReport,
                outputParameters: parametersToPass,
            };
        }

        return {
            isSuccessful: true,
            errors: [],
            executionReport,
            outputParameters: parametersToPass,
        };
    };

    return ptpExecutor;
}

/**
 * TODO: [🧠] When not meet expectations in PROMPT_DIALOG, make some way to tell the user
 * TODO: [👧] Strongly type the executors to avoid need of remove nullables whtn noUncheckedIndexedAccess in tsconfig.json
 * Note: CreatePtpExecutorOptions are just connected to PtpExecutor so do not extract to types folder
 */
