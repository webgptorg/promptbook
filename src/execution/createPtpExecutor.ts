import spaceTrim from 'spacetrim';
import { Promisable } from 'type-fest';
import { string_name } from '.././types/typeAliases';
import { PromptTemplatePipeline } from '../classes/PromptTemplatePipeline';
import { PromptTemplateJson } from '../types/PromptTemplatePipelineJson/PromptTemplateJson';
import { TaskProgress } from '../types/TaskProgress';
import { removeMarkdownFormatting } from '../utils/markdown/removeMarkdownFormatting';
import { removeEmojis } from '../utils/removeEmojis';
import { replaceParameters } from '../utils/replaceParameters';
import { ExecutionTools } from './ExecutionTools';
import { PtpExecutor } from './PtpExecutor';

interface CreatePtpExecutorOptions {
    readonly ptp: PromptTemplatePipeline;
    readonly tools: ExecutionTools;
}

/**
 * Creates executor function from prompt template pipeline and execution tools.
 *
 * Note: Consider using getExecutor method of the library instead of using this function
 */
export function createPtpExecutor(options: CreatePtpExecutorOptions): PtpExecutor {
    const { ptp, tools } = options;

    const ptpExecutor = async (
        inputParameters: Record<string_name, string>,
        onProgress?: (taskProgress: TaskProgress) => Promisable<void>,
    ) => {
        let parametersToPass: Record<string_name, string> = inputParameters;
        let currentTemplate: PromptTemplateJson | null = ptp.entryPromptTemplate;

        while (currentTemplate !== null) {
            const resultingParameter = ptp.getResultingParameter(currentTemplate.name);

            const isPrograssLoggedForCurrentTemplate = currentTemplate.executionType === 'PROMPT_TEMPLATE';

            if (onProgress && isPrograssLoggedForCurrentTemplate) {
                await onProgress({
                    name: `ptp-executor-frame-${currentTemplate.name}`,
                    title: `🖋 ${removeEmojis(removeMarkdownFormatting(currentTemplate.title))}`,
                    isDone: false,
                });
            }

            let promptResult: string | null = null;

            executionType: switch (currentTemplate.executionType) {
                case 'SIMPLE_TEMPLATE':
                    promptResult = replaceParameters(currentTemplate.content, parametersToPass);
                    break executionType;

                case 'PROMPT_TEMPLATE':
                    const prompt = {
                        ptpUrl: `${
                            ptp.ptpUrl
                                ? ptp.ptpUrl.href
                                : 'anonymous' /* <- [🧠] How to deal with anonymous PTPs, do here some auto-url like SHA-256 based ad-hoc identifier? */
                        }#${currentTemplate.name}`,
                        parameters: parametersToPass,
                        content: replaceParameters(currentTemplate.content, parametersToPass),
                        modelRequirements: currentTemplate.modelRequirements!,
                    };
                    variant: switch (currentTemplate.modelRequirements!.variant) {
                        case 'CHAT':
                            const chatThread = await tools.natural.gptChat(prompt);
                            // TODO: Use all information from chatThread like "model"
                            // TODO: [🍬] Destroy chatThread
                            promptResult = chatThread.content;
                            break variant;
                        case 'COMPLETION':
                            const completionResult = await tools.natural.gptComplete(prompt);
                            // TODO: Use all information from chatThread like "model"
                            promptResult = completionResult.content;
                            break variant;
                        default:
                            throw new Error(`Unknown model variant "${currentTemplate.modelRequirements!.variant}"`);
                    }
                    break executionType;

                case 'SCRIPT':
                    if (tools.script.length === 0) {
                        throw new Error(`No script execution tools are available`);
                    }
                    if (!currentTemplate.contentLanguage) {
                        throw new Error(`Script language is not defined for prompt template "${currentTemplate.name}"`);
                    }

                    const errors: Array<Error> = [];
                    let isSuccessful = false;

                    scripts: for (const scriptTools of tools.script) {
                        try {
                            promptResult = await scriptTools.execute({
                                scriptLanguage: currentTemplate.contentLanguage,
                                script: currentTemplate.content,
                                parameters: parametersToPass,
                            });
                            isSuccessful = true;

                            break scripts;
                        } catch (error) {
                            if (!(error instanceof Error)) {
                                throw error;
                            }

                            errors.push(error);
                        }
                    }

                    if (isSuccessful) {
                        break executionType;
                    }

                    if (errors.length === 1) {
                        throw errors[0];
                    } else {
                        throw new Error(
                            spaceTrim(
                                (block) => `
                                        Script execution failed ${errors.length} times

                                        ${block(errors.map((error) => '- ' + error.message).join('\n\n'))}
                                    `,
                            ),
                        );
                    }

                    // Note: This line is unreachable because of the break executionType above
                    break executionType;

                case 'PROMPT_DIALOG':
                    promptResult = await tools.userInterface.promptDialog({
                        prompt: replaceParameters(currentTemplate.description || '', parametersToPass),
                        defaultValue: replaceParameters(currentTemplate.content, parametersToPass),

                        // TODO: [🧠] !! Figure out how to define placeholder in .ptp.md file
                        placeholder: undefined,
                    });
                    break executionType;

                default:
                    throw new Error(`Unknown execution type "${(currentTemplate as any).executionType}"`);
            }

            if (promptResult === null) {
                //              <- TODO: [🥨] Make some NeverShouldHappenError
                throw new Error(`Something went wrong and prompt result is null`);
            }

            if (onProgress && isPrograssLoggedForCurrentTemplate) {
                onProgress({
                    name: `ptp-executor-frame-${currentTemplate.name}`,
                    isDone: true,
                });
            }

            parametersToPass = {
                ...parametersToPass,
                [resultingParameter.name]:
                    promptResult /* <- Note: Not need to detect parameter collision here because PromptTemplatePipeline checks logic consistency during construction */,
            };

            currentTemplate = ptp.getFollowingPromptTemplate(currentTemplate!.name);
        }

        return parametersToPass as Record<string_name, string>;
    };

    return ptpExecutor;
}

/**
 * TODO: [👧] Strongly type the executors to avoid need of remove nullables whtn noUncheckedIndexedAccess in tsconfig.json
 * Note: CreatePtpExecutorOptions are just connected to PtpExecutor so do not extract to types folder
 */
