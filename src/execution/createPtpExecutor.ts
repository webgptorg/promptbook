import spaceTrim from 'spacetrim';
import type { Promisable } from 'type-fest';
import type { string_name } from '.././types/typeAliases';
import type { PromptTemplatePipeline } from '../classes/PromptTemplatePipeline';
import { PTBK_VERSION } from '../config';
import type { Prompt } from '../types/Prompt';
import type { ExpectationUnit, PromptTemplateJson } from '../types/PromptTemplatePipelineJson/PromptTemplateJson';
import type { TaskProgress } from '../types/TaskProgress';
import type { ExecutionReportJson } from '../types/execution-report/ExecutionReportJson';
import { CountUtils } from '../utils/expectation-counters';
import { isValidJsonString } from '../utils/isValidJsonString';
import { removeMarkdownFormatting } from '../utils/markdown/removeMarkdownFormatting';
import { removeEmojis } from '../utils/removeEmojis';
import { replaceParameters } from '../utils/replaceParameters';
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
    readonly ptp: PromptTemplatePipeline;

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

    const ptpExecutor: PtpExecutor = async (
        inputParameters: Record<string_name, string>,
        onProgress?: (taskProgress: TaskProgress) => Promisable<void>,
    ) => {
        let parametersToPass: Record<string_name, string> = inputParameters;
        let currentTemplate: PromptTemplateJson | null = ptp.entryPromptTemplate;
        const executionReport: ExecutionReportJson = {
            ptbkUrl: ptp.ptbkUrl?.href || undefined,
            title: ptp.title || undefined,
            ptbkUsedVersion: PTBK_VERSION,
            ptbkRequestedVersion: ptp.ptbkVersion || undefined,
            description: ptp.description || undefined,
            promptExecutions: [],
        };

        try {
            while (currentTemplate !== null) {
                const resultingParameter = ptp.getResultingParameter(currentTemplate.name);

                const name = `ptp-executor-frame-${currentTemplate.name}`;
                const title = removeEmojis(removeMarkdownFormatting(currentTemplate.title));

                console.info('🛬 currentTemplate', {
                    currentTemplate,
                    resultingParameter,
                    name,
                    title,
                    parametersToPass: { ...parametersToPass },
                });

                if (onProgress) {
                    await onProgress({
                        name,
                        title,
                        isStarted: false,
                        isDone: false,
                        executionType: currentTemplate.executionType,
                        parameterName: resultingParameter.name,
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

                attempts: for (let attempt = 0; attempt < maxAttempts; attempt++) {
                    console.info(`🛬 currentTemplate attempt #${attempt}`, attempt);

                    result = null;
                    resultString = null;
                    expectError = null;

                    try {
                        executionType: switch (currentTemplate.executionType) {
                            case 'SIMPLE_TEMPLATE':
                                console.info(`🛬 currentTemplate attempt #${attempt} SIMPLE_TEMPLATE`);

                                resultString = replaceParameters(currentTemplate.content, parametersToPass);
                                break executionType;

                            case 'PROMPT_TEMPLATE':
                                console.info(`🛬 currentTemplate attempt #${attempt} PROMPT_TEMPLATE`);

                                prompt = {
                                    title: currentTemplate.title,
                                    ptbkUrl: `${
                                        ptp.ptbkUrl
                                            ? ptp.ptbkUrl.href
                                            : 'anonymous' /* <- [🧠] !!! How to deal with anonymous PTPs, do here some auto-url like SHA-256 based ad-hoc identifier? */
                                    }#${currentTemplate.name}`,
                                    parameters: parametersToPass,
                                    content: replaceParameters(currentTemplate.content, parametersToPass) /* <- [2] */,
                                    modelRequirements: currentTemplate.modelRequirements!,
                                };

                                variant: switch (currentTemplate.modelRequirements!.modelVariant) {
                                    case 'CHAT':
                                        console.info(`🛬 currentTemplate attempt #${attempt} PROMPT_TEMPLATE CHAT`);

                                        chatThread = await tools.natural.gptChat(prompt);
                                        // TODO: [🍬] Destroy chatThread
                                        result = chatThread;
                                        resultString = chatThread.content;
                                        break variant;
                                    case 'COMPLETION':
                                        console.info(
                                            `🛬 currentTemplate attempt #${attempt} PROMPT_TEMPLATE COMPLETION`,
                                        );

                                        completionResult = await tools.natural.gptComplete(prompt);
                                        result = completionResult;
                                        resultString = completionResult.content;
                                        break variant;
                                    default:
                                        console.info(`🛬 currentTemplate attempt #${attempt} PROMPT_TEMPLATE UNKNOWN`);

                                        throw new Error(
                                            `Unknown model variant "${
                                                currentTemplate.modelRequirements!.modelVariant
                                            }"`,
                                        );
                                }

                                break;

                            case 'SCRIPT':
                                console.info(`🛬 currentTemplate attempt #${attempt} SCRIPT`);

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
                                            parameters: parametersToPass,
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
                                            scriptExecutionErrors.map((error) => '- ' + error.message).join('\n\n'),
                                        )}
                                    `,
                                        ),
                                    );
                                }

                                // Note: This line is unreachable because of the break executionType above
                                break executionType;

                            case 'PROMPT_DIALOG':
                                console.info(`🛬 currentTemplate attempt #${attempt} PROMPT_DIALOG`, [
                                    currentTemplate.description,
                                    parametersToPass,
                                ]);

                                resultString = await tools.userInterface.promptDialog({
                                    prompt: replaceParameters(currentTemplate.description || '', parametersToPass),
                                    defaultValue: replaceParameters(currentTemplate.content, parametersToPass),

                                    // TODO: [🧠] !! Figure out how to define placeholder in .ptbk.md file
                                    placeholder: undefined,
                                });
                                break executionType;

                            default:
                                console.info(`🛬 currentTemplate attempt #${attempt} UNKNOWN`);

                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                throw new Error(`Unknown execution type "${(currentTemplate as any).executionType}"`);
                        }

                        if (currentTemplate.postprocessing) {
                            console.info(`🛬 currentTemplate attempt #${attempt} postprocessing`);

                            for (const functionName of currentTemplate.postprocessing) {
                                console.info(`🛬 currentTemplate attempt #${attempt} postprocessing`, functionName);

                                // TODO: DRY [1]
                                scriptExecutionErrors = [];

                                scripts: for (const scriptTools of tools.script) {
                                    try {
                                        console.info(
                                            `🛬 currentTemplate attempt #${attempt} postprocessing`,
                                            functionName,
                                            {
                                                scriptTools,
                                            },
                                        );

                                        resultString = await scriptTools.execute({
                                            scriptLanguage: `javascript` /* <- TODO: Try it in each languages; In future allow postprocessing with arbitrary combination of languages to combine */,
                                            script: `${functionName}(resultString)`,
                                            parameters: { ...parametersToPass, resultString },
                                        });

                                        break scripts;
                                    } catch (error) {
                                        if (!(error instanceof Error)) {
                                            throw error;
                                        }

                                        scriptExecutionErrors.push(error);
                                    }
                                }
                            }
                        }

                        if (currentTemplate.expectFormat) {
                            console.info(`🛬 currentTemplate attempt #${attempt} expectFormat`);

                            if (currentTemplate.expectFormat === 'JSON') {
                                if (!isValidJsonString(resultString)) {
                                    throw new ExpectError('Expected valid JSON string');
                                }
                            } else {
                                // TODO: Here should be fatal errror which breaks through the retry loop
                            }
                        }

                        if (currentTemplate.expectAmount) {
                            console.info(`🛬 currentTemplate attempt #${attempt} expectAmount`);

                            for (const [unit, { max, min }] of Object.entries(currentTemplate.expectAmount)) {
                                const amount = CountUtils[unit.toUpperCase() as ExpectationUnit](resultString);

                                console.info(`🛬 currentTemplate attempt #${attempt} expectAmount`, {
                                    unit,
                                    max,
                                    min,
                                    amount,
                                });

                                if (min && amount < min) {
                                    throw new ExpectError(`Expected at least ${min} ${unit} but got ${amount}`);
                                } /* not else */

                                if (max && amount > max) {
                                    throw new ExpectError(`Expected at most ${max} ${unit} but got ${amount}`);
                                }
                            }
                        }

                        console.info(`🛬 currentTemplate attempt #${attempt} success`);

                        break attempts;
                    } catch (error) {
                        console.info(`🛬 currentTemplate attempt #${attempt} catch`, { error });

                        if (!(error instanceof ExpectError)) {
                            throw error;
                        }
                        expectError = error;
                    } finally {
                        console.info(`🛬 currentTemplate attempt #${attempt} finally`, {
                            currentTemplate,
                            result,
                            resultString,
                            expectError,
                        });

                        if (
                            currentTemplate.executionType === 'PROMPT_TEMPLATE' &&
                            prompt!
                            //    <- Note:  [2] When some expected parameter is not defined, error will occur in replaceParameters
                            //              In that case we don’t want to make a report about it because it’s not a natural execution error
                        ) {
                            console.info(`🛬 currentTemplate attempt #${attempt} finally PROMPT_TEMPLATE`, { prompt });

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
                        console.info(`🛬 currentTemplate attempt #${attempt} (last) fail`, {
                            attempt,
                            maxExecutionAttempts,
                        });
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
                        parameterName: resultingParameter.name,
                        parameterValue: resultString,
                    });
                }

                console.info(
                    '🛬 currentTemplate success',
                    `${resultingParameter.name} = ${JSON.stringify(resultString)}`,
                );

                parametersToPass = {
                    ...parametersToPass,
                    [resultingParameter.name]:
                        resultString /* <- Note: Not need to detect parameter collision here because PromptTemplatePipeline checks logic consistency during construction */,
                };

                currentTemplate = ptp.getFollowingPromptTemplate(currentTemplate!.name);
            }
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
