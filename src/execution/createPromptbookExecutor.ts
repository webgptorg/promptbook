import spaceTrim from 'spacetrim';
import type { Promisable } from 'type-fest';
import { PromptbookJson } from '../_packages/types.index';
import { LOOP_LIMIT } from '../config';
import { validatePromptbookJson } from '../conversion/validation/validatePromptbookJson';
import { ExpectError } from '../errors/ExpectError';
import { PromptbookExecutionError } from '../errors/PromptbookExecutionError';
import { UnexpectedError } from '../errors/UnexpectedError';
import type { Prompt } from '../types/Prompt';
import type { ExpectationUnit, PromptTemplateJson } from '../types/PromptbookJson/PromptTemplateJson';
import type { TaskProgress } from '../types/TaskProgress';
import type { ExecutionReportJson } from '../types/execution-report/ExecutionReportJson';
import type { string_name } from '../types/typeAliases';
import { CountUtils } from '../utils/expectation-counters';
import { isValidJsonString } from '../utils/isValidJsonString';
import { PROMPTBOOK_VERSION } from '../version';
import { ExecutionTools } from './ExecutionTools';
import type { PromptChatResult, PromptCompletionResult, PromptResult } from './PromptResult';
import { PromptbookExecutor } from './PromptbookExecutor';
import { replaceParameters } from './utils/replaceParameters';

type CreatePromptbookExecutorSettings = {
    /**
     * When executor does not satisfy expectations it will be retried this amount of times
     *
     * @default 3
     */
    readonly maxExecutionAttempts: number;
};

/**
 * Options for creating a promptbook executor
 */
interface CreatePromptbookExecutorOptions {
    /**
     * The promptbook to be executed
     */
    readonly promptbook: PromptbookJson;

    /**
     * The execution tools to be used during the execution of the PROMPTBOOK
     */
    readonly tools: ExecutionTools;

    /**
     * Optional settings for the PROMPTBOOK executor
     */
    readonly settings?: Partial<CreatePromptbookExecutorSettings>;
}

/**
 * Creates executor function from promptbook and execution tools.
 *
 * @returns The executor function
 * @throws {PromptbookLogicError} on logical error in the promptbook
 */
export function createPromptbookExecutor(options: CreatePromptbookExecutorOptions): PromptbookExecutor {
    const { promptbook, tools, settings = {} } = options;
    const { maxExecutionAttempts = 3 } = settings;

    validatePromptbookJson(promptbook);

    const promptbookExecutor: PromptbookExecutor = async (
        inputParameters: Record<string_name, string>,
        onProgress?: (taskProgress: TaskProgress) => Promisable<void>,
    ) => {
        let parametersToPass: Record<string_name, string> = inputParameters;
        const executionReport: ExecutionReportJson = {
            promptbookUrl: promptbook.promptbookUrl,
            title: promptbook.title,
            promptbookUsedVersion: PROMPTBOOK_VERSION,
            promptbookRequestedVersion: promptbook.promptbookVersion,
            description: promptbook.description,
            promptExecutions: [],
        };

        async function executeSingleTemplate(currentTemplate: PromptTemplateJson) {
            const name = `promptbook-executor-frame-${currentTemplate.name}`;
            const title = currentTemplate.title;
            const priority = promptbook.promptTemplates.length - promptbook.promptTemplates.indexOf(currentTemplate);

            if (onProgress /* <- [3] */) {
                await onProgress({
                    name,
                    title,
                    isStarted: false,
                    isDone: false,
                    executionType: currentTemplate.executionType,
                    parameterName: currentTemplate.resultingParameterName,
                    parameterValue: null,
                    // <- [3]
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
                    throw new UnexpectedError(`Joker not found in attempt ${attempt}`);
                }

                result = null;
                resultString = null;
                expectError = null;

                if (isJokerAttempt) {
                    if (typeof parametersToPass[joker!] === 'undefined') {
                        throw new PromptbookExecutionError(`Joker parameter {${joker}} not defined`);
                    }

                    resultString = parametersToPass[joker!]!;
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
                                    promptbookUrl: `${
                                        promptbook.promptbookUrl
                                            ? promptbook.promptbookUrl
                                            : 'anonymous' /* <- [🧠][🈴] How to deal with anonymous PROMPTBOOKs, do here some auto-url like SHA-256 based ad-hoc identifier? */
                                    }#${currentTemplate.name}`,
                                    parameters: parametersToPass,
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
                                        throw new PromptbookExecutionError(
                                            `Unknown model variant "${
                                                currentTemplate.modelRequirements!.modelVariant
                                            }"`,
                                        );
                                }

                                break;

                            case 'SCRIPT':
                                if (tools.script.length === 0) {
                                    throw new PromptbookExecutionError('No script execution tools are available');
                                }
                                if (!currentTemplate.contentLanguage) {
                                    throw new PromptbookExecutionError(
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
                                    throw new PromptbookExecutionError(
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
                                throw new PromptbookExecutionError(
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
                    throw new PromptbookExecutionError(
                        spaceTrim(
                            (block) => `
                              Natural execution failed ${maxExecutionAttempts}x

                              ${block(expectError?.message || '')}
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
                    executionType: currentTemplate.executionType,
                    parameterName: currentTemplate.resultingParameterName,
                    parameterValue: resultString,
                    // <- [3]
                });
            }

            parametersToPass = {
                ...parametersToPass,
                [currentTemplate.resultingParameterName]:
                    resultString /* <- Note: Not need to detect parameter collision here because Promptbook checks logic consistency during construction */,
            };
        }

        try {
            let resovedParameters: Array<string_name> = promptbook.parameters
                .filter(({ isInput }) => isInput)
                .map(({ name }) => name);
            let unresovedTemplates: Array<PromptTemplateJson> = [...promptbook.promptTemplates];
            let resolving: Array<Promise<void>> = [];

            let loopLimit = LOOP_LIMIT;
            while (unresovedTemplates.length > 0) {
                if (loopLimit-- < 0) {
                    throw new UnexpectedError('Loop limit reached during resolving parameters promptbook execution');
                }

                const currentTemplate = unresovedTemplates.find((template) =>
                    template.dependentParameterNames.every((name) => resovedParameters.includes(name)),
                );

                if (!currentTemplate && resolving.length === 0) {
                    throw new UnexpectedError(
                        spaceTrim(`
                            Can not resolve some parameters

                            Note: This should be catched during validatePromptbookJson
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

            return {
                isSuccessful: false,
                errors: [error],
                executionReport,
                outputParameters: parametersToPass,
            };
        }

        // Note: Filter ONLY output parameters
        for (const parameter of promptbook.parameters) {
            if (parameter.isOutput) {
                continue;
            }

            delete parametersToPass[parameter.name];
        }

        return {
            isSuccessful: true,
            errors: [],
            executionReport,
            outputParameters: parametersToPass,
        };
    };

    return promptbookExecutor;
}

/**
 * TODO: [🧠] When not meet expectations in PROMPT_DIALOG, make some way to tell the user
 * TODO: [👧] Strongly type the executors to avoid need of remove nullables whtn noUncheckedIndexedAccess in tsconfig.json
 * Note: CreatePromptbookExecutorOptions are just connected to PromptbookExecutor so do not extract to types folder
 * TODO: [🧠][3] transparent = (report intermediate parameters) / opaque execution = (report only output parameters) progress reporting mode
 */
