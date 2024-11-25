import { spaceTrim } from 'spacetrim';
import type { Promisable, ReadonlyDeep, WritableDeep } from 'type-fest';
import { DEFAULT_MAX_EXECUTION_ATTEMPTS } from '../../config';
import { extractParameterNamesFromTask } from '../../conversion/utils/extractParameterNamesFromTask';
import { UnexpectedError } from '../../errors/UnexpectedError';
import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';
import type { TaskJson } from '../../pipeline/PipelineJson/TaskJson';
import type { TaskProgress } from '../../types/TaskProgress';
import type { Parameters } from '../../types/typeAliases';
import { difference } from '../../utils/sets/difference';
import { union } from '../../utils/sets/union';
import type { ExecutionReportJson } from '../execution-report/ExecutionReportJson';
import type { CreatePipelineExecutorOptions } from './00-CreatePipelineExecutorOptions';
import { executeFormatSubvalues } from './30-executeFormatSubvalues';
import { getReservedParametersForTask } from './getReservedParametersForTask';

/**
 * @@@
 *
 * @private internal type of `executeTask`
 */
type executeSingleTaskOptions = CreatePipelineExecutorOptions & {
    /**
     * @@@
     */
    readonly currentTask: ReadonlyDeep<TaskJson>;

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
export async function executeTask(options: executeSingleTaskOptions): Promise<Readonly<Parameters>> {
    const {
        currentTask,
        preparedPipeline,
        parametersToPass,
        tools,
        onProgress,
        $executionReport,
        pipelineIdentification,
        maxExecutionAttempts = DEFAULT_MAX_EXECUTION_ATTEMPTS,
    } = options;

    const name = `pipeline-executor-frame-${currentTask.name}`;
    const title = currentTask.title;
    const priority = preparedPipeline.tasks.length - preparedPipeline.tasks.indexOf(currentTask);

    await onProgress({
        name,
        title,
        isStarted: false,
        isDone: false,
        taskType: currentTask.taskType,
        parameterName: currentTask.resultingParameterName,
        parameterValue: null,
        // <- [🍸]
    });

    // Note: Check consistency of used and dependent parameters which was also done in `validatePipeline`, but it’s good to doublecheck
    const usedParameterNames = extractParameterNamesFromTask(currentTask);
    const dependentParameterNames = new Set(currentTask.dependentParameterNames);
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
        ...(await getReservedParametersForTask({
            preparedPipeline,
            task: currentTask,
            pipelineIdentification,
        })),
        ...parametersToPass,
    });

    const definedParameterNames = new Set(Object.keys(definedParameters));
    const parameters: Parameters = {};

    // Note: [2] Check that all used parameters are defined and removing unused parameters for this task
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
                        Parameter \`{${parameterName}}\` is NOT defined
                        BUT used in task "${currentTask.title || currentTask.name}"

                        This should be catched in \`validatePipeline\`

                        ${block(pipelineIdentification)}

                    `,
                ),
            );
        }
    }

    // Note: [👨‍👨‍👧] Now we can freeze `parameters` because we are sure that all and only used parameters are defined and are not going to be changed
    Object.freeze(parameters);

    const maxAttempts = currentTask.taskType === 'DIALOG_TASK' ? Infinity : maxExecutionAttempts; // <- Note: [💂]
    const jokerParameterNames = currentTask.jokerParameterNames || [];

    const preparedContent = (currentTask.preparedContent || '{content}').split('{content}').join(currentTask.content);
    //    <- TODO: [🍵] Use here `replaceParameters` to replace {websiteContent} with option to ignore missing parameters

    const resultString = await executeFormatSubvalues({
        jokerParameterNames,
        priority,
        maxAttempts,
        preparedContent,
        parameters,
        task: currentTask,
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
        taskType: currentTask.taskType,
        parameterName: currentTask.resultingParameterName,
        parameterValue: resultString,
        // <- [🍸]
    });

    return Object.freeze({
        [currentTask.resultingParameterName]:
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
