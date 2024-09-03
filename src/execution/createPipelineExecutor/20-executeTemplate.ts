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
import { ModelRequirements } from '../../types/ModelRequirements';
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
import { CreatePipelineExecutorSettings } from './00-CreatePipelineExecutorSettings';
import { getReservedParametersForTemplate } from './getReservedParametersForTemplate';

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


    attempts: for (let attempt = -jokerParameterNames.length; attempt < maxAttempts; attempt++) {

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
