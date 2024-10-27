import { spaceTrim } from 'spacetrim';
import type { Promisable, ReadonlyDeep, WritableDeep } from 'type-fest';
import { MAX_EXECUTION_ATTEMPTS } from '../../config';
import { extractParameterNamesFromTemplate } from '../../conversion/utils/extractParameterNamesFromTemplate';
import { UnexpectedError } from '../../errors/UnexpectedError';
import type { ExecutionReportJson } from '../../types/execution-report/ExecutionReportJson';
import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';
import type { TemplateJson } from '../../types/PipelineJson/TemplateJson';
import type { TaskProgress } from '../../types/TaskProgress';
import type { Parameters } from '../../types/typeAliases';
import { difference } from '../../utils/sets/difference';
import { union } from '../../utils/sets/union';
import { CreatePipelineExecutorOptions } from './00-CreatePipelineExecutorOptions';
import { executeFormatSubvalues } from './30-executeFormatSubvalues';
import { getReservedParametersForTemplate } from './getReservedParametersForTemplate';

/**
 * @@@
 *
 * @private internal type of `executeTemplate`
 */
type executeSingleTemplateOptions = CreatePipelineExecutorOptions & {
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
    readonly onProgress: (taskProgress: TaskProgress) => Promisable<void>;

    /**
     * @@@
     */
    readonly $executionReport: WritableDeep<ExecutionReportJson>;

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
        onProgress,
        $executionReport,
        pipelineIdentification,
        maxExecutionAttempts = MAX_EXECUTION_ATTEMPTS,
    } = options;

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
    // TODO: [👩🏾‍🤝‍👩🏻] Use here `mapAvailableToExpectedParameters`
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

                    Dependent parameters:
                    ${Array.from(dependentParameterNames)
                        .map((name) => `{${name}}`)
                        .join(', ')}

                    Used parameters:
                    ${Array.from(usedParameterNames)
                        .map((name) => `{${name}}`)
                        .join(', ')}

                    ${block(pipelineIdentification)}

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
    // TODO: [👩🏾‍🤝‍👩🏻] Use here `mapAvailableToExpectedParameters`
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

    // Note: [👨‍👨‍👧] Now we can freeze `parameters` because we are sure that all and only used parameters are defined and are not going to be changed
    Object.freeze(parameters);

    const maxAttempts = currentTemplate.templateType === 'DIALOG_TEMPLATE' ? Infinity : maxExecutionAttempts; // <- TODO: [🤹‍♂️]
    const jokerParameterNames = currentTemplate.jokerParameterNames || [];

    const preparedContent = (currentTemplate.preparedContent || '{content}')
        .split('{content}')
        .join(currentTemplate.content);
    //    <- TODO: [🍵] Use here `replaceParameters` to replace {websiteContent} with option to ignore missing parameters

    const resultString = await executeFormatSubvalues({
        jokerParameterNames,
        priority,
        maxAttempts,
        preparedContent,
        parameters,
        template: currentTemplate,
        preparedPipeline,
        tools,
        $executionReport,
        pipelineIdentification,
    });

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
            // <- Note: [👩‍👩‍👧] No need to detect parameter collision here because pipeline checks logic consistency during construction
            resultString,
    });
}

/**
 * TODO: [🤹‍♂️]
 */

/**
 * TODO: [🐚] Change onProgress to object that represents the running execution, can be subscribed via RxJS to and also awaited
 */
