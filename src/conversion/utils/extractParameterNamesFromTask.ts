import type { ReadonlyDeep } from 'type-fest';
import type { TaskJson } from '../../pipeline/PipelineJson/TaskJson';
import { extractVariablesFromJavascript } from '../../scripting/javascript/utils/extractVariablesFromJavascript';
import type { string_javascript_name } from '../../types/typeAliases';
import type { string_parameter_name } from '../../types/typeAliases';
import { extractParameterNames } from '../../utils/parameters/extractParameterNames';

/**
 * Parses the task and returns the set of all used parameters
 *
 * @param task the task with used parameters
 * @returns the set of parameter names
 * @throws {ParseError} if the script is invalid
 * @public exported from `@promptbook/core` <- Note: [👖] This utility is so tightly interconnected with the Promptbook that it is not exported as util but in core
 */
export function extractParameterNamesFromTask(
    task: ReadonlyDeep<
        Pick<
            TaskJson,
            'title' | 'description' | 'taskType' | 'content' | 'preparedContent' | 'jokerParameterNames' | 'foreach'
        >
    >,
): Set<string_parameter_name> {
    const { title, description, taskType, content, preparedContent, jokerParameterNames, foreach } = task;
    const parameterNames = new Set<string_parameter_name>();

    let contentParameters: Set<string_javascript_name>;
    if (taskType !== 'SCRIPT_TASK') {
        contentParameters = extractParameterNames(content);
    } else {
        // TODO: What if script is not javascript?
        // const { contentLanguage } = task;
        // if (contentLanguage !== 'javascript') {

        contentParameters = extractVariablesFromJavascript(content);
    }

    for (const parameterName of [
        ...extractParameterNames(title),
        ...extractParameterNames(description || ''),
        ...contentParameters,
        ...extractParameterNames(preparedContent || ''),
    ]) {
        parameterNames.add(parameterName);
    }

    for (const jokerName of jokerParameterNames || []) {
        parameterNames.add(jokerName);
    }

    parameterNames.delete('content');
    //                      <- Note {websiteContent} is used in `preparedContent`

    // Note: [🍭] Fixing dependent subparameterName from FOREACH command
    if (foreach !== undefined) {
        for (const subparameterName of foreach.inputSubparameterNames) {
            if (parameterNames.has(subparameterName)) {
                parameterNames.delete(subparameterName);
                parameterNames.add(foreach.parameterName);
                // <- TODO: [🚎] Warn/logic error when `subparameterName` not used
            }
        }
    }

    return parameterNames;
}

/**
 * TODO: [🔣] If script require contentLanguage
 */
