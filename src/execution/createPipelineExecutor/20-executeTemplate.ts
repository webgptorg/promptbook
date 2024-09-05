import { spaceTrim } from 'spacetrim';
import { Promisable, ReadonlyDeep } from 'type-fest';
import { extractParameterNamesFromTemplate } from '../../conversion/utils/extractParameterNamesFromTemplate';
import { UnexpectedError } from '../../errors/UnexpectedError';
import { MultipleLlmExecutionTools } from '../../llm-providers/multiple/MultipleLlmExecutionTools';
import type { ExecutionReportJson } from '../../types/execution-report/ExecutionReportJson';
import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';
import type { TemplateJson } from '../../types/PipelineJson/TemplateJson';
import type { TaskProgress } from '../../types/TaskProgress';
import type { Parameters } from '../../types/typeAliases';
import { difference } from '../../utils/sets/difference';
import { union } from '../../utils/sets/union';
import type { ExecutionTools } from '../ExecutionTools';
import type { $OngoingTemplateResult } from './$OngoingTemplateResult';
import type { CreatePipelineExecutorSettings } from './00-CreatePipelineExecutorSettings';
import { executeFormatCells } from './30-executeFormatCells';
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

    // Note: Now we can freeze `parameters` because we are sure that all and only used parameters are defined and are not going to be changed
    Object.freeze(parameters);

    const $ongoingTemplateResult: $OngoingTemplateResult = {
        $result: null,
        $resultString: null,
        $expectError: null,
        $scriptPipelineExecutionErrors: [],
    };

    const maxAttempts = currentTemplate.templateType === 'DIALOG_TEMPLATE' ? Infinity : maxExecutionAttempts; // <- TODO: [🤹‍♂️]
    const jokerParameterNames = currentTemplate.jokerParameterNames || [];

    const preparedContent = (currentTemplate.preparedContent || '{content}')
        .split('{content}')
        .join(currentTemplate.content);
    //    <- TODO: [🍵] Use here `replaceParameters` to replace {websiteContent} with option to ignore missing parameters

    await executeFormatCells({
        $ongoingTemplateResult,
        jokerParameterNames,
        priority,
        maxAttempts,
        preparedContent,
        parameters,
        template: currentTemplate,
        preparedPipeline,
        tools,
        llmTools,
        settings,
        $executionReport,
        pipelineIdentification,
    });

    if ($ongoingTemplateResult.$resultString === null) {
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
        parameterValue: $ongoingTemplateResult.$resultString,
        // <- [🍸]
    });

    return Object.freeze({
        [currentTemplate.resultingParameterName]:
            $ongoingTemplateResult.$resultString /* <- Note: Not need to detect parameter collision here because pipeline checks logic consistency during construction */,
    });
}

/**
 * TODO: [🤹‍♂️]
 */
