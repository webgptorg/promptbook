import { spaceTrim } from 'spacetrim';
import type { PartialDeep, Promisable, ReadonlyDeep, WritableDeep } from 'type-fest';
import { RESERVED_PARAMETER_NAMES } from '../../constants';
import { extractParameterNamesFromTask } from '../../conversion/utils/extractParameterNamesFromTask';
import { UnexpectedError } from '../../errors/UnexpectedError';
import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';
import type { TaskJson } from '../../pipeline/PipelineJson/TaskJson';
import type { Parameters } from '../../types/typeAliases';
import { difference } from '../../utils/sets/difference';
import { union } from '../../utils/sets/union';
import type { LlmCall } from '../../types/LlmCall';
import type { ExecutionReportJson } from '../execution-report/ExecutionReportJson';
import type { PipelineExecutorResult } from '../PipelineExecutorResult';
import type { CreatePipelineExecutorOptions } from './00-CreatePipelineExecutorOptions';
import { executeFormatSubvalues } from './30-executeFormatSubvalues';
import { getReservedParametersForTask } from './getReservedParametersForTask';

/**
 * Options for executing a single pipeline task, including task details, pipeline context, parameters, and callbacks.
 *
 * @private internal type of `executeTask`
 */
type executeSingleTaskOptions = Required<CreatePipelineExecutorOptions> & {
    /**
     * The task to be executed.
     */
    readonly currentTask: ReadonlyDeep<TaskJson>;
    //       <- TODO: [🕉] `task` vs `currentTask` - unite naming

    /**
     * The pipeline in which the task resides, fully prepared and validated.
     */
    readonly preparedPipeline: ReadonlyDeep<PipelineJson>;

    /**
     * The parameters to pass to the task execution.
     */
    readonly parametersToPass: Readonly<Parameters>;

    /**
     * Callback invoked with partial results as the execution progresses.
     */
    onProgress(newOngoingResult: PartialDeep<PipelineExecutorResult>): Promisable<void>;

    /**
     * Optional callback invoked with each LLM call.
     */
    logLlmCall?(llmCall: LlmCall): Promisable<void>;

    /**
     * Mutable execution report object for tracking execution details.
     */
    readonly $executionReport: WritableDeep<ExecutionReportJson>;

    /**
     * String identifier for the pipeline, used in error messages and reporting.
     */
    readonly pipelineIdentification: string;
};

/**
 * Executes a single task within a pipeline, handling parameter validation, error checking, and progress reporting.
 *
 * @param options - Options for execution, including the task, pipeline, parameters, and callbacks.
 * @returns The output parameters produced by the task.
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
        logLlmCall,
        $executionReport,
        pipelineIdentification,
        maxExecutionAttempts,
        maxParallelCount,
        csvSettings,
        isVerbose,
        rootDirname,
        cacheDirname,
        intermediateFilesStrategy,
        isAutoInstalled,
        isNotPreparedWarningSuppressed,
    } = options;

    const priority = preparedPipeline.tasks.length - preparedPipeline.tasks.indexOf(currentTask);

    // Note: Check consistency of used and dependent parameters which was also done in `validatePipeline`, but it’s good to doublecheck
    const usedParameterNames = extractParameterNamesFromTask(currentTask);
    const dependentParameterNames = new Set(currentTask.dependentParameterNames);
    // TODO: [👩🏾‍🤝‍👩🏻] Use here `mapAvailableToExpectedParameters`
    if (
        difference(
            union(
                difference(usedParameterNames, dependentParameterNames),
                difference(dependentParameterNames, usedParameterNames),
                // <- TODO: [💯]
            ),
            new Set(RESERVED_PARAMETER_NAMES),
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

    const reservedParameters = await getReservedParametersForTask({
        tools,
        preparedPipeline,
        task: currentTask,
        pipelineIdentification,
        parameters: parametersToPass,
        isVerbose,
    });
    const definedParameters: Parameters = Object.freeze({
        ...reservedParameters,
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
    //    <- TODO: [🍵] Use here `templateParameters` to replace {websiteContent} with option to ignore missing parameters

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
        onProgress,
        logLlmCall,
        pipelineIdentification,
        maxExecutionAttempts,
        maxParallelCount,
        csvSettings,
        isVerbose,
        rootDirname,
        cacheDirname,
        intermediateFilesStrategy,
        isAutoInstalled,
        isNotPreparedWarningSuppressed,
    });

    await onProgress({
        outputParameters: {
            [currentTask.resultingParameterName]: resultString,
        },
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
