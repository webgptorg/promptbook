import spaceTrim from 'spacetrim';
import { Promisable } from 'type-fest';
import { string_name } from '.././types/typeAliases';
import { PromptTemplatePipeline } from '../classes/PromptTemplatePipeline';
import { PTBK_VERSION } from '../config';
import { Prompt } from '../types/Prompt';
import { ExpectationUnit, PromptTemplateJson } from '../types/PromptTemplatePipelineJson/PromptTemplateJson';
import { TaskProgress } from '../types/TaskProgress';
import { ExecutionReportJson } from '../types/execution-report/ExecutionReportJson';
import { CountUtils } from '../utils/expectation-counters';
import { removeMarkdownFormatting } from '../utils/markdown/removeMarkdownFormatting';
import { removeEmojis } from '../utils/removeEmojis';
import { replaceParameters } from '../utils/replaceParameters';
import { ExecutionTools } from './ExecutionTools';
import { PromptChatResult, PromptCompletionResult, PromptResult } from './PromptResult';
import { PtpExecutor } from './PtpExecutor';

export interface CreatePtpExecutorSettings {
    /**
     * When executor does not satisfy expectations it will be retried this amount of times
     *
     * !!!!!!! Make default in version 24.1.0
     */
    readonly maxNaturalExecutionAttempts: number;
}

interface CreatePtpExecutorOptions {
    readonly ptp: PromptTemplatePipeline;
    readonly tools: ExecutionTools;
    readonly settings: CreatePtpExecutorSettings;
}

/**
 * Creates executor function from prompt template pipeline and execution tools.
 *
 * Note: Consider using getExecutor method of the library instead of using this function
 */
export function createPtpExecutor(options: CreatePtpExecutorOptions): PtpExecutor {
    const { ptp, tools, settings } = options;

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
                let naturalExecutionError: Error | null = null;
                let scriptExecutionErrors: Array<Error>;
                let isScriptExecutionSuccessful;

                executionType: switch (currentTemplate.executionType) {
                    case 'SIMPLE_TEMPLATE':
                        resultString = replaceParameters(currentTemplate.content, parametersToPass);
                        break executionType;

                    case 'PROMPT_TEMPLATE':
                        prompt = {
                            title: currentTemplate.title,
                            ptbkUrl: `${
                                ptp.ptbkUrl
                                    ? ptp.ptbkUrl.href
                                    : 'anonymous' /* <- [🧠] !!!! How to deal with anonymous PTPs, do here some auto-url like SHA-256 based ad-hoc identifier? */
                            }#${currentTemplate.name}`,
                            parameters: parametersToPass,
                            content: replaceParameters(currentTemplate.content, parametersToPass),
                            modelRequirements: currentTemplate.modelRequirements!,
                        };

                        naturalExecutionAttempts: for (
                            let attempt = 0;
                            attempt < settings.maxNaturalExecutionAttempts;
                            attempt++
                        ) {
                            result = null;
                            resultString = null;
                            naturalExecutionError = null;

                            try {
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

                                // TODO: !!!!!! Here should postprocessing happen

                                for (const [unit, { max, min }] of Object.entries(currentTemplate.expectations)) {
                                    const amount = CountUtils[unit.toUpperCase() as ExpectationUnit](resultString);

                                    // TODO: !!!!! Do not crash BUT retry some amount of times

                                    if (min && amount < min) {
                                        throw new Error(`Expected at least ${min} ${unit} but got ${amount}`);
                                    } /* not else */

                                    if (max && amount > max) {
                                        throw new Error(`Expected at most ${max} ${unit} but got ${amount}`);
                                    }
                                }
                            } catch (error) {
                                if (!(error instanceof Error)) {
                                    throw error;
                                }
                                naturalExecutionError = error;
                            } finally {
                                executionReport.promptExecutions.push({
                                    prompt: {
                                        title: prompt.title,
                                        content: prompt.content,
                                        modelRequirements: prompt.modelRequirements,
                                        // <- Note: Do want to pass ONLY wanted information to the report
                                    },
                                    result:
                                        result /* <- !!!!! Look what is exposed here and probbably also filter out */ ||
                                        undefined,
                                    error: naturalExecutionError || undefined,
                                });
                            }

                            if (result !== null && naturalExecutionError === null) {
                                break naturalExecutionAttempts;
                            }
                        }

                        throw new Error(
                            spaceTrim(
                                (block) => `
                                    Natural execution failed ${settings.maxNaturalExecutionAttempts}x

                                    ${block(naturalExecutionError?.message || '')}
                                `,
                            ),
                        );

                        break executionType;

                    case 'SCRIPT':
                        if (tools.script.length === 0) {
                            throw new Error('No script execution tools are available');
                        }
                        if (!currentTemplate.contentLanguage) {
                            throw new Error(
                                `Script language is not defined for prompt template "${currentTemplate.name}"`,
                            );
                        }

                        scriptExecutionErrors = [];
                        isScriptExecutionSuccessful = false;

                        scripts: for (const scriptTools of tools.script) {
                            try {
                                resultString = await scriptTools.execute({
                                    scriptLanguage: currentTemplate.contentLanguage,
                                    script: currentTemplate.content,
                                    parameters: parametersToPass,
                                });
                                isScriptExecutionSuccessful = true;

                                break scripts;
                            } catch (error) {
                                if (!(error instanceof Error)) {
                                    throw error;
                                }

                                scriptExecutionErrors.push(error);
                            }
                        }

                        if (isScriptExecutionSuccessful) {
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
                        resultString = await tools.userInterface.promptDialog({
                            prompt: replaceParameters(currentTemplate.description || '', parametersToPass),
                            defaultValue: replaceParameters(currentTemplate.content, parametersToPass),

                            // TODO: [🧠] !! Figure out how to define placeholder in .ptbk.md file
                            placeholder: undefined,
                        });
                        break executionType;

                    default:
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        throw new Error(`Unknown execution type "${(currentTemplate as any).executionType}"`);
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
 * TODO: [👧] Strongly type the executors to avoid need of remove nullables whtn noUncheckedIndexedAccess in tsconfig.json
 * Note: CreatePtpExecutorOptions are just connected to PtpExecutor so do not extract to types folder
 */
